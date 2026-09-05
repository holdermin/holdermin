import { motion } from 'framer-motion';
import { Target, CheckCircle2, Circle, Gift } from 'lucide-react';

const MISSIONS = [
  { id: 'first-buy', title: 'Make your first spot buy', reward: '+5 USDT', done: false },
  { id: 'invite-1', title: 'Invite 1 friend', reward: '+2 TRX', done: false },
  { id: 'charge-agent', title: 'Charge the agent 3 times', reward: 'Coming soon', done: false },
  { id: 'hold-5', title: 'Hold 5 different assets', reward: '+10 USDT', done: false },
  { id: 'daily', title: 'Open the app 7 days in a row', reward: 'Mystery box', done: false },
];

export function MissionsPage() {
  return (
    <div className="px-4 py-4" data-testid="missions-page">
      <div className="mb-5">
        <p className="tk-label">Earn more</p>
        <h1 className="tk-heading text-3xl text-ink mt-1 flex items-center gap-2"><Target className="w-7 h-7 text-mint" /> Missions</h1>
        <p className="text-sm text-mutedink mt-1">Complete quests to unlock rewards.</p>
      </div>

      <div className="space-y-3">
        {MISSIONS.map((m, i) => (
          <motion.div key={m.id} className="tk-card tk-row p-4 flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            data-testid={`mission-${m.id}`}>
            <span className="w-10 h-10 tk-icon-tile grid place-items-center">
              {m.done ? <CheckCircle2 className="w-5 h-5 text-mint" /> : <Circle className="w-5 h-5 text-mutedink" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{m.title}</p>
              <p className="tk-label mt-0.5 flex items-center gap-1"><Gift className="w-3 h-3 text-gold" /> {m.reward}</p>
            </div>
            <span className="tk-pill px-2.5 py-1">{m.done ? 'Done' : 'Todo'}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default MissionsPage;
