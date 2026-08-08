export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mosaic mb-5 w-16" aria-hidden />
      <h2 className="disp" style={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>
        {title}
      </h2>
      <p className="mt-2 max-w-[22rem]" style={{ color: 'var(--fg-dim)' }}>
        {body}
      </p>
    </div>
  )
}
