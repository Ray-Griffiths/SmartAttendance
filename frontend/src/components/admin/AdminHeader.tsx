import React, { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { LogoutConfirmModal } from "../common/LogoutConfirmModal";

export interface AdminHeaderProps {
  notificationsCount?: number;
  onLogout?: () => void;
  avatarSrc?: string;
  userName?: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  notificationsCount = 0,
  onLogout,
  avatarSrc = "/default-avatar.png",
  userName = "Admin",
}) => {
  // Get logout from context if available
  let contextLogout: (() => void) | undefined;
  try {
    const auth = useAuth();
    contextLogout = auth?.logout;
  } catch {
    contextLogout = undefined;
  }

  const resolvedOnLogout = onLogout ?? contextLogout ?? (() => {});
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Default avatar fallback
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = "/default-avatar.png";
  };

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    resolvedOnLogout();
  };

  return (
    <header className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-900 shadow-sm px-6 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      {/* Greeting */}
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 sm:mb-0">
        Welcome, <span className="text-indigo-600 dark:text-indigo-400">{userName}</span>
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="View notifications"
          title="Notifications"
          type="button"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-300" />
          {notificationsCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center"
              aria-label={`${notificationsCount} new notifications`}
            >
              {notificationsCount}
            </span>
          )}
        </button>

        {/* Avatar and Logout */}
        <div className="flex items-center gap-2">
          <img
            src={avatarSrc}
            alt={`Avatar of ${userName}`}
            onError={handleImgError}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
          />

          <button
            onClick={handleLogoutClick}
            aria-label="Logout"
            title="Logout"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors"
            type="button"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </header>
  );
};

export default AdminHeader;
