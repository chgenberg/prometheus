# Missing Data Analysis for Real Results

## 🎯 **KRITISKA DATA SOM SAKNAS**

### **1. Finansiell Data (Högsta Prioritet)**
```sql
-- Behövs i main tabellen:
ALTER TABLE main ADD COLUMN actual_net_win_chips REAL DEFAULT 0;
ALTER TABLE main ADD COLUMN actual_net_win_bb REAL DEFAULT 0;
ALTER TABLE main ADD COLUMN total_buy_ins REAL DEFAULT 0;
ALTER TABLE main ADD COLUMN total_cashouts REAL DEFAULT 0;
```

**Datakällor som behövs:**
- Faktiska vinster/förluster per session
- Buy-in belopp
- Cashout belopp
- Rake betald

### **2. Hand-by-Hand Data (Hög Prioritet)**
```sql
CREATE TABLE hand_results (
    hand_id TEXT PRIMARY KEY,
    player_id TEXT,
    position TEXT,
    hole_cards TEXT,
    action_preflop TEXT,
    action_flop TEXT,
    action_turn TEXT,
    action_river TEXT,
    final_pot_size REAL,
    won_amount REAL,
    showdown_result TEXT,
    timestamp DATETIME
);
```

**Vad detta ger:**
- Riktig win rate beräkning
- Faktisk showdown win rate
- Position-baserad analys
- Tidsbaserad analys

### **3. Session Data (Medium Prioritet)**
```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    player_id TEXT,
    start_time DATETIME,
    end_time DATETIME,
    table_type TEXT,
    stake_level TEXT,
    starting_chips REAL,
    ending_chips REAL,
    hands_played INTEGER
);
```

### **4. Real-time Events (Medium Prioritet)**
```sql
CREATE TABLE security_events (
    event_id TEXT PRIMARY KEY,
    player_id TEXT,
    event_type TEXT,
    risk_level TEXT,
    description TEXT,
    ip_address TEXT,
    timestamp DATETIME,
    auto_generated BOOLEAN
);
```

## 🔧 **SNABBA FIXES FÖR BÄTTRE DUMMY DATA**

### **1. Förbättra Finansiell Beräkning**
Istället för random, använd mer realistiska formler:

```javascript
// Baserat på faktisk poker-matematik
const calculateRealisticWinRate = (vpip, pfr, hands, postflopScore) => {
  const tightness = 100 - vpip; // Tighter = better
  const aggression = pfr / vpip; // Higher = better
  const experience = Math.min(hands / 1000, 1); // Experience cap
  const skill = postflopScore / 100; // Skill factor
  
  // Realistic win rate: -5bb/100 to +15bb/100
  const baseWinRate = -2; // Most players lose
  const skillBonus = skill * 10; // Good players win more
  const styleBonus = (aggression > 0.6 && vpip < 30) ? 5 : 0;
  const experienceBonus = experience * 3;
  
  return Math.max(-10, Math.min(15, 
    baseWinRate + skillBonus + styleBonus + experienceBonus
  ));
};
```

### **2. Realistiska Pot Sizes**
```javascript
// Baserat på stake levels och antal spelare
const calculatePotSize = (stakeLevel, numPlayers, street) => {
  const bigBlind = stakeLevel; // e.g., 500 chips
  const basePot = bigBlind * 1.5; // Blinds
  const streetMultiplier = {
    preflop: 1.5,
    flop: 2.5,
    turn: 3.5,
    river: 4.5
  };
  
  return basePot * numPlayers * 0.6 * streetMultiplier[street];
};
```

### **3. Realistiska Timestamps**
```javascript
// Baserat på faktiska poker-sessioner
const generateRealisticTimestamps = (totalHands) => {
  const handsPerHour = 80; // Typical online rate
  const sessionsPerDay = 2; // Typical player
  const avgSessionLength = 2; // hours
  
  // Generera timestamps över senaste 30 dagarna
  // Med realistiska spelscheman
};
```

## 📊 **PRIORITERAD IMPLEMENTATION**

### **Fas 1: Förbättra Dummy Data (1-2 dagar)**
1. Implementera realistiska finansiella beräkningar
2. Förbättra pot size och timestamp generering
3. Lägg till mer variation i spelarstilar

### **Fas 2: Lägg till Grundläggande Real Data (1 vecka)**
1. Skapa hand_results tabell
2. Implementera session tracking
3. Lägg till faktiska timestamps

### **Fas 3: Full Real Data Integration (2-3 veckor)**
1. Integrera med poker client för live data
2. Implementera real-time event tracking
3. Lägg till avancerad analys

## 🎯 **MEST KRITISKA FÖRBÄTTRINGAR**

### **Omedelbart (idag):**
1. **Fix net_win beräkningar** - Använd realistiska formler
2. **Fix win rates** - Baserat på faktisk poker-matematik
3. **Förbättra timestamps** - Realistiska spelscheman

### **Denna vecka:**
1. **Lägg till hand-level data** - Även om simulerad
2. **Implementera session tracking**
3. **Förbättra security event generation**

### **Nästa vecka:**
1. **Integrera med faktisk poker data**
2. **Implementera live data feeds**
3. **Lägg till avancerad analys**

---

**Slutsats:** Cirka 60% av datan är riktig (VPIP/PFR, händer, AI scores), men 40% är dummy (finansiell data, win rates, timestamps). Med rätt prioritering kan vi få 90% riktig data inom 1-2 veckor.

## 🗑️ **BORTTAGNA DUMMY DATA**

### **IP-adresser (Borttaget 2025-01-15)**
- ❌ Hash-baserade IP-adresser har tagits bort från real-time activity API
- ✅ Inte längre synliga i säkerhetsöversikten
- **Anledning:** Inte möjligt att få tag på riktiga IP-adresser, så bättre att inte visa falska 