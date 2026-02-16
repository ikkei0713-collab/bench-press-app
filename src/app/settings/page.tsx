"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  ArrowLeft,
  Save,
  Mail,
  User,
  Dumbbell,
  Lock,
  UserPlus,
  Search,
  X,
  Check,
  LogOut,
  Camera,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  bench_max: number | null;
  pause_max: number | null;
  legs_up_max: number | null;
  program_started: boolean;
  current_week: number;
  current_day: number;
  avatar_url: string | null;
}

interface Friend {
  id: string;
  display_name: string;
  current_week: number;
  current_day: number;
  bench_max: number | null;
  program_started: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [benchMax, setBenchMax] = useState("");
  const [pauseMax, setPauseMax] = useState("");
  const [legsUpMax, setLegsUpMax] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // パスワード変更
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // フレンド
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [friendDialogOpen, setFriendDialogOpen] = useState(false);

  // アバター
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const fetchFriends = useCallback(async (userId: string) => {
    const { data: friendships } = await supabase
      .from("friendships")
      .select("friend_id, user_id")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      return;
    }

    const friendIds = friendships.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, current_week, current_day, bench_max, program_started")
      .in("id", friendIds);

    if (profiles) setFriends(profiles);
  }, [supabase]);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBenchMax(data.bench_max?.toString() || "");
      setPauseMax(data.pause_max?.toString() || "");
      setLegsUpMax(data.legs_up_max?.toString() || "");
    }

    await fetchFriends(user.id);
    setLoading(false);
  }, [supabase, router, fetchFriends]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    const updates: Record<string, unknown> = {
      display_name: displayName.trim(),
    };

    const bench = benchMax ? parseFloat(benchMax) : null;
    const pause = pauseMax ? parseFloat(pauseMax) : null;
    const legsUp = legsUpMax ? parseFloat(legsUpMax) : null;

    if (bench != null) updates.bench_max = bench;
    if (pause != null) updates.pause_max = pause;
    if (legsUp != null) updates.legs_up_max = legsUp;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (!error) {
      // MAX重量が変更されたら履歴を記録
      const oldBench = profile.bench_max;
      const oldPause = profile.pause_max;
      const oldLegsUp = profile.legs_up_max;
      if (bench != null && pause != null && legsUp != null &&
          (bench !== oldBench || pause !== oldPause || legsUp !== oldLegsUp)) {
        await supabase.from("weight_history").insert({
          user_id: profile.id,
          bench_max: bench,
          pause_max: pause,
          legs_up_max: legsUp,
        });
      }
      await fetchProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword.length < 6) {
      setPasswordError("6文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("パスワードが一致しません");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError("変更に失敗しました。再ログインしてお試しください");
    } else {
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 2000);
    }
    setSavingPassword(false);
  };

  const handleSearchFriend = async () => {
    setSearching(true);
    setSearchError("");
    setSearchResult(null);

    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, current_week, current_day, bench_max, program_started")
      .eq("email", searchEmail.trim().toLowerCase())
      .single();

    if (!data) {
      setSearchError("ユーザーが見つかりません");
    } else if (data.id === profile?.id) {
      setSearchError("自分自身は追加できません");
    } else if (friends.some((f) => f.id === data.id)) {
      setSearchError("すでにフレンドです");
    } else {
      setSearchResult(data);
    }
    setSearching(false);
  };

  const handleAddFriend = async () => {
    if (!profile || !searchResult) return;
    setAdding(true);

    await supabase.from("friendships").insert({
      user_id: profile.id,
      friend_id: searchResult.id,
    });

    setFriends((prev) => [...prev, searchResult]);
    setSearchResult(null);
    setSearchEmail("");
    setFriendDialogOpen(false);
    setAdding(false);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!profile) return;

    await supabase
      .from("friendships")
      .delete()
      .or(`and(user_id.eq.${profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${profile.id})`);

    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Add cache-busting param
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id);

    await fetchProfile();
    setUploadingAvatar(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary neon-text text-2xl">Loading...</div>
      </div>
    );
  }

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
          <h1 className="font-bold text-lg">設定</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* ===== プロフィール ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-primary" />
              プロフィール
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* アバター */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-24 h-24 border-2 border-primary/30">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                    {(profile?.display_name ?? "U").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  <Camera className="w-4 h-4 text-primary-foreground" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              {uploadingAvatar && (
                <p className="text-xs text-muted-foreground animate-pulse">アップロード中...</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">表示名</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="あなたの名前"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                メールアドレス
              </Label>
              <div className="h-12 flex items-center px-3 rounded-md bg-secondary/50 text-muted-foreground text-base">
                {profile?.email}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== MAX重量 ===== */}
        {profile?.program_started && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Dumbbell className="w-5 h-5 text-primary" />
                MAX重量
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ベンチプレス MAX (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={benchMax}
                  onChange={(e) => setBenchMax(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>2秒止め MAX (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pauseMax}
                  onChange={(e) => setPauseMax(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>足上げ MAX (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={legsUpMax}
                  onChange={(e) => setLegsUpMax(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ※ 変更するとプログラムの重量が再計算されます
              </p>
            </CardContent>
          </Card>
        )}

        {/* 保存ボタン */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 text-lg font-bold neon-glow"
        >
          {saving ? "保存中..." : saved ? (
            <><Check className="w-5 h-5 mr-2" />保存しました！</>
          ) : (
            <><Save className="w-5 h-5 mr-2" />変更を保存</>
          )}
        </Button>

        <Separator />

        {/* ===== パスワード変更 ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-5 h-5 text-primary" />
              パスワード変更
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>新しいパスワード（6文字以上）</Label>
              <Input
                type="password"
                placeholder="新しいパスワード"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>パスワード確認</Label>
              <Input
                type="password"
                placeholder="もう一度入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {passwordError && (
              <p className="text-destructive text-sm">{passwordError}</p>
            )}

            <Button
              onClick={handlePasswordChange}
              disabled={savingPassword || !newPassword || !confirmPassword}
              variant="secondary"
              className="w-full h-12 text-base"
            >
              {savingPassword ? "変更中..." : passwordSaved ? (
                <><Check className="w-4 h-4 mr-2" />変更しました！</>
              ) : (
                "パスワードを変更"
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* ===== フレンド管理 ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-primary" />
                フレンド管理
              </CardTitle>
              <Dialog open={friendDialogOpen} onOpenChange={setFriendDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="neon-glow">
                    <UserPlus className="w-4 h-4 mr-1" />
                    追加
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
                        onClick={handleSearchFriend}
                        disabled={searching || !searchEmail.trim()}
                        className="h-12 px-6"
                      >
                        <Search className="w-5 h-5" />
                      </Button>
                    </div>

                    {searchError && (
                      <p className="text-sm text-muted-foreground text-center">{searchError}</p>
                    )}

                    {searchResult && (
                      <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {searchResult.display_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{searchResult.display_name}</p>
                              {searchResult.program_started && (
                                <p className="text-xs text-muted-foreground">
                                  Week {searchResult.current_week}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button onClick={handleAddFriend} disabled={adding} size="sm">
                            {adding ? "追加中..." : "追加"}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {friends.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                まだフレンドがいません
              </p>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {friend.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{friend.display_name}</p>
                        {friend.program_started ? (
                          <p className="text-xs text-muted-foreground">
                            W{friend.current_week}-D{friend.current_day} / ベンチ{friend.bench_max}kg
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">未開始</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* ===== ログアウト ===== */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full h-14 text-lg"
        >
          <LogOut className="w-5 h-5 mr-2" />
          ログアウト
        </Button>
      </main>
    </div>
  );
}
