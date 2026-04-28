import { Navbar } from "@/components/admin-panel/navbar";

interface ContentLayoutProps {
  title: string;
  hideTitleOnScroll?: boolean;
  hideIconsOnScroll?: boolean;
  children: React.ReactNode;
}

export function ContentLayout({
  title,
  hideTitleOnScroll,
  hideIconsOnScroll,
  children,
}: ContentLayoutProps) {
  return (
    <div>
      <Navbar
        title={title}
        hideTitleOnScroll={hideTitleOnScroll}
        hideIconsOnScroll={hideIconsOnScroll}
      />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
