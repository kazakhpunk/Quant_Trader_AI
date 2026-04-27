import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Menu } from "@/components/admin-panel/menu";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/admin-panel/sidebar-toggle";
import CopyLink from "../v4/copy-link";

export function Sidebar() {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300",
        sidebar?.isOpen === false ? "w-[90px]" : "w-72"
      )}
    >
      <SidebarToggle isOpen={sidebar?.isOpen} setIsOpen={sidebar?.setIsOpen} />
      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-800">
        <Link
          href="/"
          className={cn(
            "my-1 flex items-center transition-[padding] duration-300 hover:opacity-85",
            sidebar?.isOpen === false ? "justify-center" : "ml-3"
          )}
        >
          <BrandLogo
            className={cn("h-5 w-5", sidebar?.isOpen === false ? "" : "mr-2")}
            size={20}
          />
          <span
            className={cn(
              "font-bold whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
              sidebar?.isOpen === false
                ? "-translate-x-96 opacity-0 hidden"
                : "translate-x-0 opacity-100"
            )}
          >
            Quant Trader AI
          </span>
        </Link>
        <Menu isOpen={sidebar?.isOpen} />
      </div>
    </aside>
  );
}
