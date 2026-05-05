export function MyChatsPage() {
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-black">My Chats</h1>
      <p className="text-slate-600">Saved chats will move here next, including relationship status and pending scene badges.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {['Maprang - warm route', 'Narin - rival route'].map((chat) => (
          <article className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm" key={chat}>
            <p className="font-black">{chat}</p>
            <p className="mt-1 text-sm text-slate-500">Relationship status and latest scene summary placeholder.</p>
          </article>
        ))}
      </div>
    </div>
  )
}
