import { Navbar } from "@/components/admin-panel/navbar";

interface ContentLayoutProps {
  title: string;
  hideTitleOnScroll?: boolean;
  children: React.ReactNode;
}

export function ContentLayout({ title, hideTitleOnScroll, children }: ContentLayoutProps) {
  return (
    <div>
      <Navbar title={title} hideTitleOnScroll={hideTitleOnScroll} />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
