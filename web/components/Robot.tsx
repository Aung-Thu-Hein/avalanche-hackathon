/**
 * Generated mascot (public/robot.png, background removed). Its face is a blank
 * screen; whatever you pass as children is drawn on it, so it can animate and
 * recolour with the risk band (set --band on a parent).
 * Screen box measured from the source image.
 */
export function Robot({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`robot ${className}`}>
      <div className="robot-glow" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/robot.png" alt="" draggable={false} />
      <div className="robot-screen">{children}</div>
    </div>
  );
}
