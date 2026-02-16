"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Shield,
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  Dumbbell,
  ChevronRight,
} from "lucide-react";

const ADMIN_EMAIL = "ikkei0713@gmail.com";

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  current_week: number;
  current_day: number;
  bench_max: number | null;
  pause_max: number | null;
  legs_up_max: number | null;
  program_started: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserFriend {
  id: string;
  display_name: string;
  bench_max: number | null;
  program_started: boolean;
  current_week: number;
  current_day: number;
  avatar_url: string | null;
}

interface UserSession {
  week: number;
  day: number;
  completed_at: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // ユーザー詳細ダイアログ
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [userFriends, setUserFriends] = useState<UserFriend[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // フレンド追加ダイアログ
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);
  const [removingFriend, setRemovingFriend] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_get_all_users");
    if (error) {
      console.error("admin_get_all_users error:", error);
      return;
    }
    if (data) setUsers(data as AdminUser[]);
  }, [supabase]);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      if (user.email !== ADMIN_EMAIL) {
        router.push("/dashboard");
        return;
      }
      setIsAdmin(true);
      await fetchUsers();
      setLoading(false);
    };
    checkAdmin();
  }, [supabase, router, fetchUsers]);

  const openUserDetail = async (user: AdminUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
    setLoadingDetail(true);
    setUserFriends([]);
    setUserSessions([]);

    const [friendsRes, sessionsRes] = await Promise.all([
      supabase.rpc("admin_get_user_friends", { target_user_id: user.id }),
      supabase.rpc("admin_get_user_sessions", { target_user_id: user.id }),
    ]);

    if (friendsRes.data) setUserFriends(friendsRes.data as UserFriend[]);
    if (sessionsRes.data) setUserSessions(sessionsRes.data as UserSession[]);
    setLoadingDetail(false);
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!selectedUser) return;
    setAddingFriend(targetUserId);

    await supabase.rpc("admin_add_friendship", {
      user_a: selectedUser.id,
      user_b: targetUserId,
    });

    // リフレッシュ
    const { data } = await supabase.rpc("admin_get_user_friends", {
      target_user_id: selectedUser.id,
    });
    if (data) setUserFriends(data as UserFriend[]);
    setAddingFriend(null);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!selectedUser) return;
    setRemovingFriend(friendId);

    await supabase.rpc("admin_remove_friendship", {
      user_a: selectedUser.id,
      user_b: friendId,
    });

    setUserFriends((prev) => prev.filter((f) => f.id !== friendId));
    setRemovingFriend(null);
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

  if (!isAdmin) return null;

  // 詳細ダイアログ表示中のユーザーのフレンドIDリスト
  const friendIds = userFriends.map((f) => f.id);
  // フレンド追加候補（selectedUser本人と既存フレンドを除外）
  const addCandidates = users.filter(
    (u) => u.id !== selectedUser?.id && !friendIds.includes(u.id)
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">管理画面</h1>
          <Badge className="ml-auto">
            {users.length} ユーザー
          </Badge>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{users.length}</p>
              <p className="text-xs text-muted-foreground">総ユーザー</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {users.filter((u) => u.program_started).length}
              </p>
              <p className="text-xs text-muted-foreground">プログラム中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {users.filter((u) => !u.program_started).length}
              </p>
              <p className="text-xs text-muted-foreground">未開始</p>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              全ユーザー一覧
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {users.map((user, index) => (
              <div key={user.id}>
                <div
                  className="flex items-center gap-3 py-3 cursor-pointer hover:bg-primary/5 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => openUserDetail(user)}
                >
                  <Avatar className="w-10 h-10">
                    {user.avatar_url ? (
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.display_name}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {(user.display_name || user.email.charAt(0)).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.display_name || "未設定"}
                      {user.email === ADMIN_EMAIL && (
                        <Shield className="w-3 h-3 inline ml-1 text-primary" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {user.program_started ? (
                      <Badge variant="outline" className="neon-border text-primary text-xs">
                        W{user.current_week}-D{user.current_day}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        未開始
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                {index < users.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      {/* ユーザー詳細ダイアログ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {selectedUser?.avatar_url ? (
                  <AvatarImage
                    src={selectedUser.avatar_url}
                    alt={selectedUser.display_name}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary">
                  {(selectedUser?.display_name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedUser?.display_name || "未設定"}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {selectedUser?.email}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <p className="text-center text-muted-foreground py-8 animate-pulse">
              読み込み中...
            </p>
          ) : (
            <div className="space-y-5 pt-2">
              {/* プロフィール情報 */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  プロフィール
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">ベンチMAX</p>
                    <p className="font-bold">
                      {selectedUser?.bench_max ?? "未設定"}kg
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">2秒止め</p>
                    <p className="font-bold">
                      {selectedUser?.pause_max ?? "未設定"}kg
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">足上げ</p>
                    <p className="font-bold">
                      {selectedUser?.legs_up_max ?? "未設定"}kg
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">進捗</p>
                    <p className="font-bold">
                      {selectedUser?.program_started
                        ? `W${selectedUser.current_week}-D${selectedUser.current_day}`
                        : "未開始"}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">登録日</p>
                    <p className="font-bold text-xs">
                      {selectedUser?.created_at
                        ? formatDate(selectedUser.created_at)
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">
                      完了セッション
                    </p>
                    <p className="font-bold">{userSessions.length}回</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 完了セッション */}
              {userSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    完了セッション ({userSessions.length})
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {userSessions.map((s) => (
                      <Badge
                        key={`${s.week}-${s.day}`}
                        variant="outline"
                        className="text-xs"
                      >
                        W{s.week}-D{s.day}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* フレンド一覧 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    フレンド ({userFriends.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddFriendOpen(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    追加
                  </Button>
                </div>
                {userFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    フレンドなし
                  </p>
                ) : (
                  <div className="space-y-1">
                    {userFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            {friend.avatar_url ? (
                              <AvatarImage
                                src={friend.avatar_url}
                                alt={friend.display_name}
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {friend.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {friend.display_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {friend.program_started
                                ? `W${friend.current_week}-D${friend.current_day} / ${friend.bench_max}kg`
                                : "未開始"}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveFriend(friend.id)}
                          disabled={removingFriend === friend.id}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* フレンド追加ダイアログ */}
      <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.display_name} にフレンドを追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 pt-2">
            {addCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                追加可能なユーザーがいません
              </p>
            ) : (
              addCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      {candidate.avatar_url ? (
                        <AvatarImage
                          src={candidate.avatar_url}
                          alt={candidate.display_name}
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {(
                          candidate.display_name || candidate.email.charAt(0)
                        ).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {candidate.display_name || "未設定"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddFriend(candidate.id)}
                    disabled={addingFriend === candidate.id}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    {addingFriend === candidate.id ? "追加中" : "追加"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
