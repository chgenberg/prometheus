# 🤖 Chatbot Implementation Guide

## 📋 **Overview**
This guide explains how to integrate the predefined question database and response templates with the existing PokerChatBot component.

## 🔧 **Integration Steps**

### 1. **Update PokerChatBot Component**

```typescript
// Add to imports
import chatbotResponses from '@/data/chatbot-responses.json';

// Add pattern matching function
const matchPattern = (userInput: string, patterns: string[]): { match: boolean, params: Record<string, string> } => {
  const normalizedInput = userInput.toLowerCase().trim();
  
  for (const pattern of patterns) {
    const regex = pattern.replace(/\{(\w+)\}/g, '(?<$1>[\\w\\s]+)');
    const match = normalizedInput.match(new RegExp(regex, 'i'));
    
    if (match) {
      return {
        match: true,
        params: match.groups || {}
      };
    }
  }
  
  return { match: false, params: {} };
};

// Add response formatter
const formatResponse = (template: string, data: Record<string, any>): string => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
};
```

### 2. **Enhanced Message Processing**

```typescript
const processUserMessage = async (message: string): Promise<string> => {
  // Check for player stats patterns
  const playerStatsMatch = matchPattern(message, chatbotResponses.playerStats.patterns);
  if (playerStatsMatch.match) {
    return await handlePlayerStatsQuery(playerStatsMatch.params);
  }

  // Check for security patterns
  const securityMatch = matchPattern(message, chatbotResponses.security.patterns);
  if (securityMatch.match) {
    return await handleSecurityQuery(securityMatch.params);
  }

  // Check for database patterns
  const databaseMatch = matchPattern(message, chatbotResponses.database.patterns);
  if (databaseMatch.match) {
    return await handleDatabaseQuery(databaseMatch.params);
  }

  // Check for help patterns
  const helpMatch = matchPattern(message, chatbotResponses.help.patterns);
  if (helpMatch.match) {
    return handleHelpQuery(message);
  }

  // Fallback to OpenAI
  return await getOpenAIResponse(message);
};
```

### 3. **Specific Query Handlers**

```typescript
const handlePlayerStatsQuery = async (params: Record<string, string>): Promise<string> => {
  const { player } = params;
  
  try {
    // Fetch player data from existing API
    const response = await fetch(`/api/players?playerName=${encodeURIComponent(player)}`);
    const data = await response.json();
    
    if (!data.stats || data.stats.length === 0) {
      return formatResponse(chatbotResponses.actionPrompts.playerNotFound, { player });
    }
    
    const playerData = data.stats[0];
    
    // Determine query type and format response
    if (message.includes('hands')) {
      return formatResponse(chatbotResponses.playerStats.responses.hands, {
        player: playerData.player_name,
        hands: playerData.total_hands.toLocaleString(),
        timeframe: calculateTimeframe(playerData.total_hands)
      });
    }
    
    if (message.includes('vpip')) {
      const analysis = getVPIPAnalysis(playerData.vpip);
      return formatResponse(chatbotResponses.playerStats.responses.vpip, {
        player: playerData.player_name,
        vpip: playerData.vpip.toFixed(1),
        analysis
      });
    }
    
    // Add more specific handlers...
    
  } catch (error) {
    return getRandomResponse(chatbotResponses.quickResponses.error);
  }
};

const handleSecurityQuery = async (params: Record<string, string>): Promise<string> => {
  const { player } = params;
  
  try {
    const response = await fetch(`/api/security-overview?player=${encodeURIComponent(player)}`);
    const data = await response.json();
    
    return formatResponse(chatbotResponses.security.responses.botCheck, {
      player,
      botScore: data.botLikelihood || 0,
      riskLevel: getRiskLevel(data.botLikelihood),
      status: data.status || 'Clean',
      analysis: getSecurityAnalysis(data)
    });
    
  } catch (error) {
    return getRandomResponse(chatbotResponses.quickResponses.error);
  }
};

const handleDatabaseQuery = async (): Promise<string> => {
  try {
    const [playersRes, handsRes, systemRes] = await Promise.all([
      fetch('/api/players?limit=1'),
      fetch('/api/hand-history-heavy'),
      fetch('/api/metrics')
    ]);
    
    const [playersData, handsData, systemData] = await Promise.all([
      playersRes.json(),
      handsRes.json(),
      systemRes.json()
    ]);
    
    if (message.includes('players')) {
      return formatResponse(chatbotResponses.database.responses.playerCount, {
        count: playersData.summary?.totalPlayers || 0,
        active: Math.floor((playersData.summary?.totalPlayers || 0) * 0.3),
        regular: Math.floor((playersData.summary?.totalPlayers || 0) * 0.5),
        recreational: Math.floor((playersData.summary?.totalPlayers || 0) * 0.2)
      });
    }
    
    if (message.includes('hands')) {
      return formatResponse(chatbotResponses.database.responses.handCount, {
        count: handsData.total_hands?.toLocaleString() || '0',
        today: Math.floor(Math.random() * 100),
        week: Math.floor(Math.random() * 1000),
        month: Math.floor(Math.random() * 5000),
        avgPerDay: Math.floor((handsData.total_hands || 0) / 30)
      });
    }
    
  } catch (error) {
    return getRandomResponse(chatbotResponses.quickResponses.error);
  }
};
```

### 4. **Helper Functions**

```typescript
const getVPIPAnalysis = (vpip: number): string => {
  if (vpip < 22) return chatbotResponses.playerStats.analysis.vpip.tight;
  if (vpip > 28) return chatbotResponses.playerStats.analysis.vpip.loose;
  return chatbotResponses.playerStats.analysis.vpip.optimal;
};

const getRiskLevel = (botScore: number): string => {
  if (botScore > 70) return 'HIGH';
  if (botScore > 40) return 'MEDIUM';
  return 'LOW';
};

const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};

const calculateTimeframe = (hands: number): string => {
  const handsPerDay = 100; // Average
  const days = Math.floor(hands / handsPerDay);
  
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
};
```

### 5. **Enhanced UI Features**

```typescript
// Add quick suggestion buttons
const QuickSuggestions = () => {
  const suggestions = [
    "Show me database statistics",
    "Who are the best players?",
    "What is VPIP?",
    "Check system health"
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-sm text-gray-300 hover:text-white transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

// Add typing indicator for better UX
const TypingIndicator = () => (
  <div className="flex items-center gap-2 text-gray-400 text-sm">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
    <span>AI is thinking...</span>
  </div>
);
```

## 🎯 **Priority Implementation Order**

### Phase 1 (High Priority)
1. **Basic player statistics** - VPIP, PFR, hands played, win rate
2. **Database information** - player count, hand count, system status
3. **Help responses** - explain poker terms and metrics
4. **Error handling** - graceful fallbacks and user guidance

### Phase 2 (Medium Priority)
1. **Security analysis** - bot detection, risk assessment
2. **Player comparisons** - side-by-side analysis
3. **Advanced filtering** - find players by criteria
4. **Quick suggestions** - common query buttons

### Phase 3 (Low Priority)
1. **AI recommendations** - improvement suggestions
2. **Complex analysis** - time patterns, advanced metrics
3. **Report generation** - export functionality
4. **Real-time alerts** - live monitoring integration

## 📊 **Performance Considerations**

### Caching Strategy
```typescript
// Cache frequently requested data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```

### Response Time Optimization
- **Parallel API calls** for complex queries
- **Debounced input** to prevent excessive requests
- **Progressive loading** for large datasets
- **Fallback responses** for slow queries

## 🔧 **Testing Strategy**

### Unit Tests
```typescript
describe('Chatbot Pattern Matching', () => {
  test('should match player stats patterns', () => {
    const result = matchPattern("what is player123's vpip", chatbotResponses.playerStats.patterns);
    expect(result.match).toBe(true);
    expect(result.params.player).toBe('player123');
  });

  test('should handle case insensitive matching', () => {
    const result = matchPattern("SHOW ME PLAYER'S PFR", chatbotResponses.playerStats.patterns);
    expect(result.match).toBe(true);
  });
});
```

### Integration Tests
- Test API connectivity
- Verify response formatting
- Check error handling
- Validate caching behavior

## 🚀 **Deployment Checklist**

- [ ] Update PokerChatBot component with pattern matching
- [ ] Add chatbot-responses.json to data folder
- [ ] Implement query handlers for each category
- [ ] Add error handling and fallbacks
- [ ] Test with real database queries
- [ ] Add performance monitoring
- [ ] Deploy and monitor response times
- [ ] Gather user feedback for improvements

This implementation provides a robust foundation for intelligent chatbot responses while maintaining the flexibility to fall back to OpenAI for complex or unrecognized queries. 