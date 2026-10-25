"use client";

import React from "react";
import { useSettingsProfile } from "./hooks/useSettingsProfile";
import SettingsHeader from "./components/SettingsHeader";
import SettingsAccountCard from "./components/SettingsAccountCard";
import SettingsPermissionsCard from "./components/SettingsPermissionsCard";
import SettingsEditModal from "./components/SettingsEditModal";

export default function SettingsPage() {
  const {
    loading,
    email,
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
  } = useSettingsProfile();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <SettingsHeader openEditModal={openEditModal} />

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#004a87] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Memuat data profil akun...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <SettingsAccountCard
              username={username}
              email={email}
              regional={regional}
              siteArea={siteArea}
              copiedUsername={copiedUsername}
              handleCopyUsername={handleCopyUsername}
              getRoleDisplayName={getRoleDisplayName}
              getRoleBadgeStyle={getRoleBadgeStyle}
              openEditModal={openEditModal}
            />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <SettingsPermissionsCard
              roleDisplayName={getRoleDisplayName()}
            />
          </div>
        </div>
      )}

      <SettingsEditModal
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        handleSaveProfile={handleSaveProfile}
        errorMessage={errorMessage}
        successMessage={successMessage}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        showCurrentPw={showCurrentPw}
        setShowCurrentPw={setShowCurrentPw}
        showNewPw={showNewPw}
        setShowNewPw={setShowNewPw}
        showConfirmPw={showConfirmPw}
        setShowConfirmPw={setShowConfirmPw}
        isSamePassword={isSamePassword}
        saving={saving}
      />
    </div>
  );
}
