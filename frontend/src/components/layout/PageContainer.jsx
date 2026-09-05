export function PageContainer({ children, className = '' }) {
  return (
    <div className={`relative min-h-screen pb-28 ${className}`}>
      <div className="tk-orb one" />
      <div className="tk-orb two" />
      <div className="relative z-10 max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}

export default PageContainer;
