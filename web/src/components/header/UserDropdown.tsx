import { useEffect, useMemo, useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase"; // <-- adjust path if needed
import { api } from "../../lib/api";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("/images/user/owner.jpg");
  const [firmName, setFirmName] = useState("");

  const navigate = useNavigate();

  function toggleDropdown() {
    setIsOpen((v) => !v);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  // Load auth user + profile name
  useEffect(() => {
  (async () => {
    try {
      setLoadingUser(true);

      // Auth user
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user;
      setUserEmail(u?.email || "");

      // Profile
      const res = await api("/api/profile");
      const p = res?.profile;

      setUserName((p?.name || "User").trim());
      setFirmName((p?.firm_name || "").trim());
    } catch {
      setUserName("User");
      setFirmName("");
    } finally {
      setLoadingUser(false);
    }
  })();
}, []);


  

  const onSignOut = async () => {
    try {
      closeDropdown();
      await supabase.auth.signOut();
      navigate("/signin");
    } catch {
      navigate("/signin");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
        type="button"
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
  <svg
    className="h-6 w-6 text-gray-600 dark:text-gray-300"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 20.25a7.5 7.5 0 0115 0"
    />
  </svg>
</span>


        <div className="mr-1 text-left leading-tight">
          <span className="block font-medium text-theme-sm">
            {loadingUser ? "Loading..." : userName}
          </span>

          {firmName && (
          <span className="block text-[11px] text-gray-500 dark:text-gray-400">
            {firmName}
          </span>
          )}
        </div>


        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="leading-tight">
  <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-200">
    {loadingUser ? "Loading..." : userName}
  </span>

  {firmName && (
    <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
      {firmName}
    </span>
  )}

  <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400 break-all">
    {userEmail || "-"}
  </span>
</div>


        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Edit profile
            </DropdownItem>
          </li>
        </ul>

        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
          type="button"
        >
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
