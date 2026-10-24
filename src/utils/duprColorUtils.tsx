import React from 'react';
import { isPlayerNR, getPlayerEffectiveRating } from './matchGeneratorUtils';
import type { OpenPlayMatchRosterItem } from '../components/admin/adminTypes';

export type DuprRatingTier =
  | 'nr'
  | 'beginner'
  | 'intermediate'
  | 'high_intermediate'
  | 'advanced'
  | 'pro';

export interface DuprColorConfig {
  tier: DuprRatingTier;
  tierLabel: string;
  badgeClass: string;
  textClass: string;
  dotClass: string;
  borderClass: string;
  formattedRating: string;
  isNR: boolean;
  numericRating: number;
}

/**
 * Resolves the visual color theme, tier, and formatted string for any DUPR rating.
 *
 * Tier Breakdown:
 * - Unrated (NR): Amber / Warm Slate (bg-amber-500/15 text-amber-300)
 * - Beginner (1.000 - 2.999): Sky Blue (bg-sky-500/15 text-sky-300)
 * - Intermediate (3.000 - 3.499): Emerald Green (bg-emerald-500/15 text-emerald-300)
 * - High Intermediate (3.500 - 3.999): Purple / Violet (bg-purple-500/15 text-purple-300)
 * - Advanced (4.000 - 4.499): Flame Orange (bg-orange-500/15 text-orange-300)
 * - Elite / Pro (4.500+): Trophy Gold (bg-amber-400/20 text-yellow-300 ring-1 ring-amber-400/30)
 */
export const getDuprColorConfig = (
  rawRating?: string | number,
  skillLevel?: string,
  player?: Partial<OpenPlayMatchRosterItem>
): DuprColorConfig => {
  const dummyItem: OpenPlayMatchRosterItem = {
    id: player?.id || 'temp',
    name: player?.name || '',
    skillLevel: skillLevel || player?.skillLevel || '',
    type: player?.type || 'primary',
    duprRating: rawRating !== undefined ? String(rawRating) : player?.duprRating,
    adminDuprRating: player?.adminDuprRating,
    duprId: player?.duprId,
    adminDuprId: player?.adminDuprId,
    status: 'active',
  };

  const isNR = isPlayerNR(dummyItem);
  const effRating = getPlayerEffectiveRating(dummyItem);

  if (isNR) {
    return {
      tier: 'nr',
      tierLabel: 'Unrated (NR)',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      textClass: 'text-amber-300',
      dotClass: 'bg-amber-400',
      borderClass: 'border-amber-500/30',
      formattedRating: `NR • ~${effRating.toFixed(1)}`,
      isNR: true,
      numericRating: effRating,
    };
  }

  // Parse established rating
  const ratingNum = typeof rawRating === 'number' ? rawRating : parseFloat(String(rawRating).replace(/[^0-9.]/g, ''));
  const safeNum = !isNaN(ratingNum) && ratingNum >= 1.0 ? ratingNum : effRating;
  const formattedRating = `★ ${safeNum.toFixed(2)}`;

  if (safeNum >= 4.5) {
    return {
      tier: 'pro',
      tierLabel: 'Pro / Elite (4.5+)',
      badgeClass:
        'bg-amber-400/20 text-yellow-300 border border-amber-400/50 shadow-xs ring-1 ring-amber-400/30',
      textClass: 'text-yellow-300',
      dotClass: 'bg-yellow-300',
      borderClass: 'border-amber-400/50',
      formattedRating,
      isNR: false,
      numericRating: safeNum,
    };
  }

  if (safeNum >= 4.0) {
    return {
      tier: 'advanced',
      tierLabel: 'Advanced (4.0–4.4)',
      badgeClass: 'bg-orange-500/15 text-orange-300 border border-orange-500/40',
      textClass: 'text-orange-300',
      dotClass: 'bg-orange-400',
      borderClass: 'border-orange-500/40',
      formattedRating,
      isNR: false,
      numericRating: safeNum,
    };
  }

  if (safeNum >= 3.5) {
    return {
      tier: 'high_intermediate',
      tierLabel: 'High Intermediate (3.5–3.9)',
      badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/40',
      textClass: 'text-purple-300',
      dotClass: 'bg-purple-400',
      borderClass: 'border-purple-500/40',
      formattedRating,
      isNR: false,
      numericRating: safeNum,
    };
  }

  if (safeNum >= 3.0) {
    return {
      tier: 'intermediate',
      tierLabel: 'Intermediate (3.0–3.4)',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40',
      textClass: 'text-emerald-300',
      dotClass: 'bg-emerald-400',
      borderClass: 'border-emerald-500/40',
      formattedRating,
      isNR: false,
      numericRating: safeNum,
    };
  }

  // Beginner (< 3.0)
  return {
    tier: 'beginner',
    tierLabel: 'Beginner (2.0–2.9)',
    badgeClass: 'bg-sky-500/15 text-sky-300 border border-sky-500/40',
    textClass: 'text-sky-300',
    dotClass: 'bg-sky-400',
    borderClass: 'border-sky-500/40',
    formattedRating,
    isNR: false,
    numericRating: safeNum,
  };
};

interface DuprRatingBadgeProps {
  rating?: string | number;
  skillLevel?: string;
  player?: Partial<OpenPlayMatchRosterItem>;
  showDot?: boolean;
  prefix?: string;
  className?: string;
}

export const DuprRatingBadge: React.FC<DuprRatingBadgeProps> = ({
  rating,
  skillLevel,
  player,
  showDot = false,
  prefix,
  className = '',
}) => {
  const config = getDuprColorConfig(rating, skillLevel, player);

  return (
    <span
      className={`font-mono text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1.5 transition-colors ${config.badgeClass} ${className}`}
      title={`${config.tierLabel} • Rating: ${config.numericRating.toFixed(2)}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />}
      {prefix && <span className="opacity-75">{prefix}</span>}
      <span>{config.formattedRating}</span>
    </span>
  );
};
