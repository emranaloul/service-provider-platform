import { create } from 'zustand';

// Academy roles are not defined yet — every screen allows 'admin' for now.
export const ROLES = ['admin'] as const;
export type Role = (typeof ROLES)[number];

interface LayoutState {
  role: Role;
  /**
   * Sidebar group expansion override — at most one group open at a time.
   * `undefined` = no explicit choice yet, derive from the active route;
   * `null` = explicitly collapsed all groups; a string = that group's id.
   */
  openNavGroup: string | null | undefined;
  sidebarOpen: boolean;
  /** Mobile nav drawer (Sheet) open state — independent of desktop collapse */
  mobileNavOpen: boolean;
  setRole: (role: Role) => void;
  toggleNavGroup: (id: string, activeDefault: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  role: 'admin',
  openNavGroup: undefined,
  sidebarOpen: true,
  mobileNavOpen: false,
  setRole: (role) => set({ role }),
  toggleNavGroup: (id, activeDefault) =>
    set((state) => {
      const isOpen =
        state.openNavGroup !== undefined
          ? state.openNavGroup === id
          : activeDefault;
      return { openNavGroup: isOpen ? null : id };
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
