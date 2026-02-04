export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="order-layout">
      {children}
    </div>
  );
}