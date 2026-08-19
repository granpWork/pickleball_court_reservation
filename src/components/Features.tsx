import { CalendarRange, Users2, ChevronRight, LayoutDashboard, ShoppingBag } from 'lucide-react';

const FEATURES = [
  {
    icon: CalendarRange,
    title: 'Instant Reservations',
    desc: 'Reserve a premium pickleball court. Select time, share the cost with friends, and get instant digital access keys.',
    badge: 'Real-Time',
  },
  {
    icon: Users2,
    title: 'DUPR Matchmaking',
    desc: 'Never play an uneven match again. Find local players matching your exact skill rating (from DUPR 2.0 to 5.0+) for competitive play.',
    badge: 'Smart Engine',
  },
  {
    icon: ShoppingBag,
    title: 'Premium Gear Rentals',
    desc: 'Add professional paddles (JOOLA, Selkirk) and fresh balls to your reservation. Pick them up from smart lockers on arrival.',
    badge: 'On-Demand',
  },
  {
    icon: LayoutDashboard,
    title: 'Ladder Leagues & Events',
    desc: 'Join local round-robins, track your tournament standings, and easily manage your club ladders from a single intuitive dashboard.',
    badge: 'Community',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-dark-bg/40 relative overflow-hidden border-t border-dark-border">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[60%] bg-brand-emerald/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-lime mb-3">
            Engineered For Pickleball
          </h2>
          <h3 className="text-3xl font-bold text-white mb-5">
            Everything you need to play, compete, and connect
          </h3>
          <p className="text-slate-400 text-lg font-normal">
            Stop messaging group chats. PicklePoint simplifies booking and player matching so you spend more time inside the kitchen.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col justify-between text-left group"
              >
                <div>
                  {/* Icon Wrapper */}
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-dark-border flex items-center justify-center text-brand-lime mb-6 group-hover:bg-brand-lime group-hover:text-dark-bg transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Badge */}
                  <span className="text-xs font-medium tracking-wider uppercase px-2 py-0.5 rounded-md bg-dark-border text-slate-400 border border-slate-800">
                    {feat.badge}
                  </span>

                  {/* Title */}
                  <h4 className="text-xl font-semibold text-white mt-4 mb-2 group-hover:text-brand-lime transition-colors">
                    {feat.title}
                  </h4>

                  {/* Description */}
                  <p className="text-base font-normal text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                {/* Footer link */}
                <div className="mt-8 flex items-center gap-1 text-sm font-semibold text-slate-300 group-hover:text-brand-lime transition-colors cursor-pointer">
                  <span>Learn more</span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Highlights Section */}
        <div id="matchmaking" className="mt-24 grid lg:grid-cols-12 gap-12 items-center bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 sm:p-12 backdrop-blur-sm">
          <div className="lg:col-span-6 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-lime bg-brand-lime/10 px-3 py-1 rounded-full border border-brand-lime/20">
              Community Lobbies
            </span>
            <h3 className="text-3xl font-bold text-white mt-4 mb-4">
              Find local players at your level
            </h3>
            <p className="text-slate-300 text-base font-normal leading-relaxed mb-6">
              Create open booking lobbies where other players can join and split the court fee. Specify DUPR ranges, gender split, and match types (Singles or Doubles). No more empty spots or uneven games.
            </p>
            
            <ul className="space-y-3">
              {[
                'Cost sharing: Automatically split court rates directly at checkout.',
                'Skill rating verification: Link DUPR or complete self-assessments.',
                'Match styles: Filter for Recreational, Competitive, or Drills.',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-slate-400 text-base font-normal">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-lime mt-2"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Graphical Representation of a Lobby list */}
          <div className="lg:col-span-6 w-full">
            <div className="glass-panel border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center pb-3 border-b border-dark-border mb-4">
                <span className="text-sm font-semibold font-bold uppercase text-slate-400">Open Court Matchups Today</span>
                <span className="text-sm font-normal text-brand-lime">3 active lobbies</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    court: 'Court A',
                    time: '04:00 PM',
                    type: 'Doubles (Mixed)',
                    rating: 'DUPR 3.0 - 4.0',
                    players: ['Alex M.', 'Sarah K.', 'John D.'],
                    spotsLeft: 1,
                  },
                  {
                    court: 'Court B',
                    time: '06:30 PM',
                    type: 'Singles (Men)',
                    rating: 'DUPR 4.0 - 4.5',
                    players: ['Marcus R.'],
                    spotsLeft: 1,
                  },
                  {
                    court: 'Court A',
                    time: '08:00 PM',
                    type: 'Doubles (Co-ed)',
                    rating: 'Recreational (All)',
                    players: ['Jenny S.', 'Dave P.'],
                    spotsLeft: 2,
                  },
                ].map((lobby, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl bg-dark-bg/60 border border-dark-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{lobby.court}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 font-medium">
                          {lobby.rating}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>Time: {lobby.time}</span>
                        <span>•</span>
                        <span>{lobby.type}</span>
                      </div>

                      {/* Avatar List */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <div className="flex -space-x-2">
                          {lobby.players.map((p, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-slate-800 border border-dark-bg text-[8px] font-bold flex items-center justify-center text-white"
                              title={p}
                            >
                              {p.substring(0, 2)}
                            </div>
                          ))}
                          {Array.from({ length: lobby.spotsLeft }).map((_, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-dark-bg border border-dashed border-slate-700 text-[8px] font-bold flex items-center justify-center text-brand-lime"
                            >
                              +
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {lobby.spotsLeft === 1 ? '1 slot open' : `${lobby.spotsLeft} slots open`}
                        </span>
                      </div>
                    </div>

                    <button className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold bg-brand-lime/10 hover:bg-brand-lime border border-brand-lime/20 hover:border-brand-lime hover:text-dark-bg text-brand-lime transition-all cursor-pointer">
                      Join Lobby
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
