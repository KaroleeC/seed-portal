# Commission & Bonus Structure

## Commission Structure

- **Setup Commission**: 20% of setup fee
- **Month 1 Commission**: 40% of first month's monthly recurring revenue (MRR)
- **Residual Commission**: 10% of months 2-12 MRR

## Monthly Bonus Structure

Based on clients closed per month:

### Tier 1: 5 Clients

- **Reward**: $500 cash or AirPods
- **Target**: 5 clients closed in calendar month

### Tier 2: 10 Clients

- **Reward**: $1,000 cash or Apple Watch
- **Target**: 10 clients closed in calendar month

### Tier 3: 15+ Clients

- **Reward**: $1,500 cash or MacBook Air
- **Target**: 15 or more clients closed in calendar month

## Milestone Bonus Structure

Based on total clients closed (all-time):

### 25 Clients Milestone

- **Reward**: $1,000 bonus

### 40 Clients Milestone

- **Reward**: $5,000 bonus

### 60 Clients Milestone

- **Reward**: $7,500 bonus

### 100 Clients Milestone

- **Reward**: $10,000 bonus + Equity participation

## Current Implementation Status

- ✅ Commission tracking operational with real HubSpot data
- ✅ Monthly bonus progress tracking implemented (clients closed based)
- ✅ Milestone progress tracking framework available
- ⚠️ Need to align admin tracker with sales dashboard bonus display format

## Data Sources

- **Commissions**: Calculated from HubSpot paid invoices
- **Monthly Bonuses**: Tracked via `monthly_bonuses` table based on clients closed count
- **Milestone Bonuses**: Tracked via `milestone_bonuses` table based on cumulative client achievements
