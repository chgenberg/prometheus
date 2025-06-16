ARKIVERADE KOMPONENTER - PROMETHEUS POKER ANALYTICS
================================================================

Denna mapp innehåller komponenter som tagits bort från huvudapplikationen 
men sparats för framtida användning. Alla komponenter är funktionella och 
kan återintegreras vid behov.

ARKIV-STRUKTUR:
├── ai-analytics/        - Avancerade AI-analyser och beteendeanalys
├── game-features/       - Interaktiva spelfunktioner
├── admin-tools/         - Administrativa och utvecklarverktyg
└── README.txt          - Denna fil

================================================================
AI-ANALYTICS KOMPONENTER
================================================================

1. BehavioralAnalytics.tsx
   SYFTE: Avancerad beteendeanalys av spelare med tilt-detection och sessionsmönster
   FUNKTIONER:
   - Realtids tilt-detection från 5,967 händelser
   - Sessionanalys från 30,622 datapunkter  
   - Variansanalys med 6,003 riskfönster
   - Visualisering av beteendemönster
   VARFÖR ARKIVERAD: Alltför komplicerad för slutanvändare, mer lämpad för professionella analyser
   ÅTERANVÄND VID: Utveckling av professionell/enterprise version

2. TimePatternAnalysis.tsx  
   SYFTE: Analys av spelares tidsmönster och prestanda över tid
   FUNKTIONER:
   - Analys av optimal speltid
   - Prestationsmönster över veckan/månaden
   - Tidsbaserade insights och rekommendationer
   VARFÖR ARKIVERAD: Nischad användning, användes inte på huvudsidan
   ÅTERANVÄND VID: Detaljerad spelschemaoptimering

================================================================
GAME-FEATURES KOMPONENTER  
================================================================

3. PokerGame.tsx
   SYFTE: Interaktivt pokerspel för demonstration och test
   FUNKTIONER:
   - Fullt funktionellt pokerspel
   - AI-motståndare
   - Handhistorik och statistik
   - Visualisering av spellogik
   VARFÖR ARKIVERAD: Toy feature, inte relevant för analysapplikation
   ÅTERANVÄND VID: Utbildningssyfte eller demo-funktioner

4. PokerChatBot.tsx
   SYFTE: AI-chatbot för pokerrelaterade frågor och analyser  
   FUNKTIONER:
   - Natural language processing
   - Pokerregler och strategifrågor
   - Handanalys via chat
   - Integrerad med analysdata
   VARFÖR ARKIVERAD: Nice-to-have feature, inte kärnfunktionalitet
   ÅTERANVÄND VID: Förbättrad användarupplevelse eller support

================================================================
ADMIN-TOOLS KOMPONENTER
================================================================

5. TiltAnalysisDashboard.tsx (REDAN BORTTAGEN)
   SYFTE: Administrativ dashboard för detaljerad tilt-analys
   FUNKTIONER:
   - Djup tilt-händelseanalys
   - Administrativa kontroller
   - Systemstatistik
   VARFÖR ARKIVERAD: Administrativ funktion, inte för slutanvändare

================================================================
TEKNISK INFORMATION
================================================================

DATABAS-BEROENDEN:
- BehavioralAnalytics: Använder tilt_events, player_sessions tabeller
- TimePatternAnalysis: Använder detailed_actions för tidsanalys  
- PokerGame: Fristående, ingen databas-integration
- PokerChatBot: API-integration för AI-svar

API-ENDPOINTS SOM ANVÄNDS:
- /api/tilt-analysis (för BehavioralAnalytics)
- /api/time-patterns (för TimePatternAnalysis)
- /api/players (för chatbot-integration)

ÅTERINTEGRATION:
1. Kopiera component-fil tillbaka till /src/components/
2. Lägg till import i berörd sida (page.tsx)
3. Kontrollera att API-endpoints fungerar
4. Testa funktionalitet

================================================================
UNDERHÅLL
================================================================

SKAPAD: 2025-06-15
SENAST UPPDATERAD: 2025-06-15  
VERSION: 1.0
ANSVARIG: Prometheus Development Team

NOTERA: Alla komponenter är fullt funktionella vid arkivering.
Kontrollera kompatibilitet med aktuell codebase vid återanvändning. 