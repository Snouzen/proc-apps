import { useState, useEffect } from "react";
import { getMe, getMeSync, setMeCache, announceSessionChange } from "@/lib/me";

export interface UserProfile {
  email?: string;
  role?: "pusat" | "rm" | "sitearea" | "magang" | "spb_dki";
  regional?: string | null;
  siteArea?: string | null;
}

export function useSettingsProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [copiedUsername, setCopiedUsername] = useState(false);

  // Edit Account Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Eye toggles for typing in edit modal
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Form submission state
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = (force = false) => {
    return getMe(force)
      .then((data) => {
        if (data && data.authenticated) {
          setProfile(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const cached = getMeSync();
    if (cached && cached.authenticated) {
      setProfile(cached);
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const email = profile?.email || "";
  const role = profile?.role || "pusat";
  const regional = profile?.regional || null;
  const siteArea = profile?.siteArea || null;

  // Derive username cleanly
  const username = email ? email.split("@")[0] : (role || "admin");

  const getRoleDisplayName = () => {
    switch (role) {
      case "pusat":
        return "Super Admin (Pusat)";
      case "rm":
        return "Regional Manager (RM)";
      case "sitearea":
        return "Admin Cabang (Site Area)";
      case "magang":
        return "Admin Bisnis / Sales";
      default:
        return "Pengguna Sistem";
    }
  };

  const getRoleBadgeStyle = () => {
    switch (role) {
      case "pusat":
        return "bg-blue-100 text-[#004a87] border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "rm":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "sitearea":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
      case "magang":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const handleCopyUsername = () => {
    if (!username) return;
    navigator.clipboard.writeText(username);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  const openEditModal = () => {
    setEditUsername(username);
    setEditEmail(email);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setIsEditModalOpen(true);
  };

  const isSamePassword = Boolean(
    newPassword && currentPassword && newPassword === currentPassword
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage("Password saat ini wajib diisi untuk verifikasi keamanan.");
      return;
    }

    if (newPassword) {
      if (newPassword === currentPassword) {
        setErrorMessage(
          "Password baru tidak boleh sama dengan password saat ini. Silakan buat password yang berbeda."
        );
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage("Password baru minimal harus 6 karakter.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("Konfirmasi password baru tidak cocok.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui profil akun.");
      }

      setSuccessMessage(data.message || "Profil berhasil diperbarui!");
      if (data.user) {
        const updated = {
          authenticated: true,
          email: data.user.email,
          role: data.user.role,
          regional: data.user.regional,
          siteArea: data.user.siteArea,
        };
        setProfile(updated);
        setMeCache(updated);
        announceSessionChange();
      }

      setTimeout(() => {
        setIsEditModalOpen(false);
        fetchProfile(true);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    profile,
    email,
    role,
    regional,
    siteArea,
    username,
    copiedUsername,
    handleCopyUsername,
    getRoleDisplayName,
    getRoleBadgeStyle,
    isEditModalOpen,
    setIsEditModalOpen,
    openEditModal,
    editUsername,
    setEditUsername,
    editEmail,
    setEditEmail,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPw,
    setShowCurrentPw,
    showNewPw,
    setShowNewPw,
    showConfirmPw,
    setShowConfirmPw,
    saving,
    errorMessage,
    successMessage,
    isSamePassword,
    handleSaveProfile,
  };
}
