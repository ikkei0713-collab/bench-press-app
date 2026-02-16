"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, Trophy, Search, ChevronRight } from "lucide-react";

interface FriendProfile {
  id: string;
  display_name: string;
  current_week: number;
  current_day: number;
  bench_max: number | null;
  program_started: boolean;
  avatar_url: string | null;
}

export default function FriendsPage() {
  const [myProfile, setMyProfile] = useState<FriendProfile | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<FriendProfile | null>(null);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // フレンドのフレンド一覧ダイアログ
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [selectedFriendFriends, setSelectedFriendFriends] = useState<FriendProfile[]>([]);
  const [friendDetailOpen, setFriendDetailOpen] = useState(false);
  const [loadingFriendFriends, setLoadingFriendFriends] = useState(false);
  const [addingFromDetail, setAddingFromDetail] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const fetchFriends = useCallback(
    async (currentUserId: string) => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id, user_id")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = friendships.map((f) =>
        f.user_id === currentUserId ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select(
          "id, display_name, current_week, current_day, bench_max, program_started, avatar_url"
        )
        .in("id", friendIds);

      if (profiles) {
        setFriends(profiles);
      }
    },
    [supabase]
  );

  // 特定のフレンドのフレンド一覧を取得（RPC関数でRLSバイパス）
  const fetchFriendsFriends = useCallback(
    async (friend: FriendProfile) => {
      setSelectedFriend(friend);
      setFriendDetailOpen(true);
      setLoadingFriendFriends(true);
      setSelectedFriendFriends([]);

      const { data: profiles } = await supabase
        .rpc("get_friends_of_user", { target_user_id: friend.id });

      if (profiles && profiles.length > 0) {
        setSelectedFriendFriends(profiles as FriendProfile[]);
      }
      setLoadingFriendFriends(false);
    },
    [supabase]
  );

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      // 自分のプロフィールを取得
      const { data: me } = await supabase
        .from("profiles")
        .select(
          "id, display_name, current_week, current_day, bench_max, program_started, avatar_url"
        )
        .eq("id", user.id)
        .single();

      if (me) setMyProfile(me);

      await fetchFriends(user.id);
      setLoading(false);
    };
    load();
  }, [supabase, router, fetchFriends]);

  const handleSearch = async () => {
    setSearching(true);
    setSearchError("");
    setSearchResult(null);

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, display_name, current_week, current_day, bench_max, program_started, avatar_url"
      )
      .eq("email", searchEmail.trim().toLowerCase())
      .single();

    if (!data) {
      setSearchError("ユーザーが見つかりません");
    } else if (data.id === userId) {
      setSearchError("自分自身は追加できません");
    } else if (friends.some((f) => f.id === data.id)) {
      setSearchError("すでにフレンドです");
    } else {
      setSearchResult(data);
    }
    setSearching(false);
  };

  const handleAddFriend = async () => {
    if (!userId || !searchResult) return;
    setAdding(true);

    await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: searchResult.id,
    });

    setFriends((prev) => [...prev, searchResult]);
    setSearchResult(null);
    setSearchEmail("");
    setDialogOpen(false);
    setAdding(false);
  };

  const handleAddFromDetail = async (target: FriendProfile) => {
    if (!userId) return;
    setAddingFromDetail(target.id);

    await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: target.id,
    });

    setFriends((prev) => [...prev, target]);
    setAddingFromDetail(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary neon-text text-2xl">
          Loading...
        </div>
      </div>
    );
  }

  // 自分 + フレンドを統合してソート
  const allMembers = [
    ...(myProfile?.program_started ? [myProfile] : []),
    ...friends.filter((f) => f.program_started),
  ].sort((a, b) => {
    if (b.current_week !== a.current_week)
      return b.current_week - a.current_week;
    return b.current_day - a.current_day;
  });

  // 自分の順位を取得
  const myRank = myProfile
    ? allMembers.findIndex((m) => m.id === myProfile.id)
    : -1;

  const renderMember = (
    member: FriendProfile,
    rank: number,
    isMe: boolean
  ) => (
    <div
      className={`flex items-center gap-3 py-2 ${!isMe ? "cursor-pointer hover:bg-primary/5 rounded-lg px-1 -mx-1 transition-colors" : ""}`}
      onClick={() => {
        if (!isMe) fetchFriendsFriends(member);
      }}
    >
      <div className="w-8 text-center shrink-0">
        {rank === 0 ? (
          <span className="text-xl">🥇</span>
        ) : rank === 1 ? (
          <span className="text-xl">🥈</span>
        ) : rank === 2 ? (
          <span className="text-xl">🥉</span>
        ) : (
          <span className="text-sm text-muted-foreground font-bold">
            {rank + 1}
          </span>
        )}
      </div>
      <Avatar className="w-10 h-10">
        {member.avatar_url ? (
          <AvatarImage src={member.avatar_url} alt={member.display_name} />
        ) : null}
        <AvatarFallback
          className={`text-sm ${isMe ? "bg-primary/30 text-primary font-bold" : "bg-primary/20 text-primary"}`}
        >
          {member.display_name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isMe ? "text-primary" : ""}`}>
          {member.display_name}
          {isMe && (
            <span className="text-xs ml-1 text-muted-foreground">（自分）</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          ベンチMAX: {member.bench_max}kg
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={isMe ? "neon-border text-primary font-bold" : "neon-border text-primary"}
        >
          W{member.current_week}-D{member.current_day}
        </Badge>
        {!isMe && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-bold text-lg">フレンド</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="neon-glow">
                <UserPlus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>フレンドを追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="メールアドレスで検索"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="h-12 text-base"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={searching || !searchEmail.trim()}
                    className="h-12 px-6"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>

                {searchError && (
                  <p className="text-sm text-muted-foreground text-center">
                    {searchError}
                  </p>
                )}

                {searchResult && (
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {searchResult.avatar_url ? (
                            <AvatarImage
                              src={searchResult.avatar_url}
                              alt={searchResult.display_name}
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {searchResult.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {searchResult.display_name}
                          </p>
                          {searchResult.program_started && (
                            <p className="text-xs text-muted-foreground">
                              Week {searchResult.current_week}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleAddFriend}
                        disabled={adding}
                        size="sm"
                      >
                        {adding ? "追加中..." : "追加"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* 自分の情報 - 固定表示 */}
      {myProfile?.program_started && (
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-primary/20">
          <div className="max-w-lg mx-auto px-4">
            {renderMember(myProfile, myRank, true)}
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Leaderboard */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              リーダーボード
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {allMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                まだフレンドがいません。
                <br />
                右上の＋ボタンからフレンドを追加しましょう！
              </p>
            ) : (
              allMembers.map((member, index) => {
                const isMe = member.id === myProfile?.id;
                return (
                  <div key={member.id}>
                    {renderMember(member, index, isMe)}
                    {index < allMembers.length - 1 && <Separator />}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Non-started friends */}
        {friends.filter((f) => !f.program_started).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                プログラム未開始のフレンド
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {friends
                .filter((f) => !f.program_started)
                .map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 py-1 cursor-pointer hover:bg-primary/5 rounded-lg px-1 -mx-1 transition-colors"
                    onClick={() => fetchFriendsFriends(friend)}
                  >
                    <Avatar className="w-8 h-8">
                      {friend.avatar_url ? (
                        <AvatarImage
                          src={friend.avatar_url}
                          alt={friend.display_name}
                        />
                      ) : null}
                      <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
                        {friend.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm flex-1">{friend.display_name}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* フレンドのフレンド一覧ダイアログ */}
      <Dialog open={friendDetailOpen} onOpenChange={setFriendDetailOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {selectedFriend?.avatar_url ? (
                  <AvatarImage
                    src={selectedFriend.avatar_url}
                    alt={selectedFriend.display_name}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {selectedFriend?.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedFriend?.display_name} のフレンド</p>
                {selectedFriend?.program_started && (
                  <p className="text-xs text-muted-foreground font-normal">
                    W{selectedFriend.current_week}-D{selectedFriend.current_day} / ベンチ{selectedFriend.bench_max}kg
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {loadingFriendFriends ? (
              <p className="text-center text-muted-foreground py-8 animate-pulse">
                読み込み中...
              </p>
            ) : selectedFriendFriends.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                フレンドがいません
              </p>
            ) : (
              selectedFriendFriends.map((fof) => {
                const isMe = fof.id === userId;
                const alreadyFriend = isMe || friends.some((f) => f.id === fof.id);
                return (
                  <div
                    key={fof.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        {fof.avatar_url ? (
                          <AvatarImage
                            src={fof.avatar_url}
                            alt={fof.display_name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {fof.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {fof.display_name}
                          {isMe && (
                            <span className="text-xs ml-1 text-muted-foreground">
                              （自分）
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fof.program_started
                            ? `W${fof.current_week}-D${fof.current_day} / ベンチ${fof.bench_max}kg`
                            : "未開始"}
                        </p>
                      </div>
                    </div>
                    {!alreadyFriend && (
                      <Button
                        size="sm"
                        onClick={() => handleAddFromDetail(fof)}
                        disabled={addingFromDetail === fof.id}
                        className="shrink-0"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        {addingFromDetail === fof.id ? "追加中" : "追加"}
                      </Button>
                    )}
                    {alreadyFriend && !isMe && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        フレンド済み
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
