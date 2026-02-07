# MTG Deckbuilding Theory Research

## Executive Summary

This document compiles authoritative research on Magic: The Gathering deckbuilding theory, covering core components, archetypes, synergy patterns, Commander-specific considerations, and expert heuristics. The research draws from established MTG community sources including EDHREC, MTG Wiki, Draftsim, Star City Games, and mathematical analyses from Pro Tour Hall of Famer Frank Karsten.

---

## Table of Contents

1. [Core Deckbuilding Components](#1-core-deckbuilding-components)
2. [Common MTG Archetypes](#2-common-mtg-archetypes)
3. [Card Synergy and Affinity](#3-card-synergy-and-affinity)
4. [Commander-Specific Deckbuilding Patterns](#4-commander-specific-deckbuilding-patterns)
5. [Deckbuilding Heuristics from Experienced Players](#5-deckbuilding-heuristics-from-experienced-players)
6. [Sources and Citations](#6-sources-and-citations)

---

## 1. Core Deckbuilding Components

### 1.1 Mana Curve

The **mana curve** is a fundamental concept in Magic theory representing the distribution of cards by their mana costs. The term originated from visually graphing a deck's mana costs, which typically forms a curve shape.

#### Definition
> "The mana curve is the application of mana optimization theory to deck construction. By organizing the cards that are to go into a deck by their casting cost, a player can see how likely they will be able to optimally utilize each turn's mana." — [MTG Wiki](https://mtg.fandom.com/wiki/Mana_curve)

#### Historical Context
The mana curve concept emerged in the mid-1990s with Ray Schneider's "Sligh" aggressive strategies. These decks demonstrated that a critical mass of low-cost threats deployed efficiently could win games, fundamentally influencing all subsequent mana curve theory.

#### Land Count Guidelines by Format

| Format | Archetype | Land Count | Notes |
|--------|-----------|------------|-------|
| 60-Card Constructed | Aggro | 20-22 | Lower curve, more threats |
| 60-Card Constructed | Midrange | 23-25 | Consistent midgame |
| 60-Card Constructed | Control | 24-27 | Higher-cost spells |
| Limited (40-card) | General | 17 | Format-dependent |
| Commander (100-card) | Midrange | 36-38 | Safe starting point |

#### Key Principles
- A well-balanced mana curve ensures the deck "does useful things almost every turn"
- Balance is critical: too many high-cost spells lead to slow starts; too many low-cost spells cause late-game exhaustion
- The curve should prioritize efficient, scalable cards over forcing a specific shape
- **Recommendation**: Playtest 10-20 games and re-evaluate curve based on performance

### 1.2 Card Advantage

Card advantage is the dominant paradigm for deck-building and analysis in Magic theory.

#### Definition
> "The player with access to a greater number of cards and effects will tend to win the game." — [MTG Salvation](https://www.mtgsalvation.com/forums/retired-forums/retired-forums/articles/404915-magic-theory-from-the-ground-up-part-i)

#### Types of Card Advantage

| Type | Description | Example |
|------|-------------|---------|
| **Raw Card Advantage** | Literally drawing more cards than opponent | Divination (draw 2 cards) |
| **Virtual Card Advantage** | Drawing more *relevant* cards than opponent | Sideboard cards in specific matchups |
| **Card Quality** | Having better individual cards | Replacing a vanilla creature with one having relevant abilities |

#### Relationship with Tempo
> "Tempo and card advantage frequently compete with one another. You make sacrifices in tempo to gain card advantage, or you make sacrifices in card advantage (or card quality) to gain tempo." — [Wizards of the Coast](https://magic.wizards.com/en/news/feature/tempo-card-advantage-delicate-balance-2014-11-17)

### 1.3 Tempo

Tempo measures the advantage gained by spending mana more effectively than your opponent.

#### Definition
> "Tempo is the advantage gained by spending mana more effectively than your opponent." — [Card Kingdom](https://blog.cardkingdom.com/what-is-tempo/)

#### Key Concepts
- **Mana Efficiency**: Using all available mana each turn optimally
- **Board Development**: Deploying threats faster than opponent can answer
- **Tempo Plays**: Cards that set opponent back while advancing your position (e.g., bounce spells)

### 1.4 Removal

Removal refers to cards that eliminate opponent's threats from the battlefield.

#### Importance
> "Faster cards and more ramp means more spells getting cast which require more 'answers'. Removal can often save you from losing the game by removing a threat, or a value engine that can 'run away' with the game." — [EDHREC](https://edhrec.com/articles/using-categories-to-improve-deckbuilding-edhrecast-332)

#### Categories of Removal
| Category | Examples | Considerations |
|----------|----------|----------------|
| **Spot Removal** | Fatal Push, Swords to Plowshares | Efficient, targeted |
| **Mass Removal** | Wrath of God, Damnation | Board wipes, high cost |
| **Conditional Removal** | Doom Blade, Eliminate | Cheaper but limited |
| **Exile-Based** | Path to Exile, Anguished Unmaking | Prevents recursion |

### 1.5 Threats

Threats are cards that advance your win condition and force opponent responses.

#### Balancing Threats and Answers
> "A 6-drop that is great on turn 7 does nothing if you're dead on turn 4. Balance threats with early answers." — [Draftsim](https://draftsim.com/mtg-mana-curve/)

#### Threat Quality Considerations
- **Must-Answer Threats**: Cards that win the game if unanswered
- **Resilient Threats**: Cards with built-in protection or recursion
- **Efficient Threats**: High impact relative to mana cost
- **Synergistic Threats**: Cards that amplify other deck elements

---

## 2. Common MTG Archetypes

### 2.1 The Four Core Archetypes

Magic decks are classified into four broad archetypes that define strategy and composition.

#### The Rock-Paper-Scissors Dynamic
> "The main archetypes Aggro, Combo, and Control form the rock, paper, and scissors of Magic: The Gathering." — [CBR](https://www.cbr.com/mtg-guide-to-magics-biggest-archetypes/)

| Matchup | Favored | Reason |
|---------|---------|--------|
| Aggro vs Control | Aggro | Develops advantage before control stabilizes |
| Control vs Combo | Control | Can disrupt combo pieces |
| Combo vs Aggro | Combo | Can combo off before aggro wins |

### 2.2 Aggro

**Goal**: Win through maximum damage application over minimum turns.

#### Characteristics
- Focus on attacking opponent's life total
- Low mana curve (primarily 1-3 mana cards)
- Fast, efficient creatures
- Limited interaction, maximum threat density

#### Classic Examples
- Red Deck Wins
- Affinity
- Zoo
- White Weenie

#### Deck Composition
| Component | Typical Count (60-card) |
|-----------|------------------------|
| Lands | 20-22 |
| Creatures | 24-30 |
| Removal/Burn | 8-12 |
| Other Spells | 2-8 |

### 2.3 Control

**Goal**: Win through card advantage after neutralizing all threats.

#### Characteristics
> "Control decks spend their first few turns dealing with threats until they 'stabilize.' Stability is achieved by dealing with aggro/midrange's board state to the point where you're able to reliably find an answer for each single threat an opponent plays." — [CBR](https://www.cbr.com/mtg-guide-to-magics-biggest-archetypes/)

- High interaction density
- Card draw engines
- Few but powerful win conditions
- Late-game focus

#### Key Components
| Category | Purpose | Example Cards |
|----------|---------|---------------|
| Counterspells | Prevent threats | Counterspell, Mana Leak |
| Spot Removal | Answer resolved threats | Fatal Push, Path to Exile |
| Board Wipes | Reset the board | Wrath of God, Supreme Verdict |
| Card Draw | Maintain advantage | Opt, Think Twice |
| Win Conditions | Close the game | Teferi, Torrential Gearhulk |

### 2.4 Midrange

**Goal**: Outvalue opponents with efficient answers and high-quality threats.

#### Definition
> "If aggro plans to dominate the early game and control plans to dominate the late game, then Midrange is best in the midgame." — [CBR](https://www.cbr.com/mtg-guide-to-magics-biggest-archetypes/)

#### Characteristics
- Combines aggro's pressure with control's answers
- Efficient removal suite
- High-quality individual threats
- Flexible game plan

#### Classic Example: Jund
> "Jund is the classic example of a Midrange deck, playing powerful threats in the form of Tarmogoyf backed up with strong removal options like Fatal Push and Bolt. Even a small smattering of card advantage in the form of Dark Confidant or Bloodbraid Elf gives the Jund deck an edge as the match progresses to the midgame."

### 2.5 Combo

**Goal**: Assemble a combination of cards that wins the game immediately or creates an insurmountable advantage.

#### Definition
> "'Combo' decks are defined by using the interaction of two or more cards (a 'combination') to create a powerful effect that either wins the game immediately or creates a situation that subsequently leads to a win." — [MTG Wiki](https://mtg.fandom.com/wiki/Archetype)

#### Characteristics
- Focused on assembling specific card combinations
- Often includes tutors and card selection
- Protection for combo pieces
- "Weak-strong-weak" power curve (weak early and late, devastating at combo turn)

#### Types of Combos
| Type | Description | Example |
|------|-------------|---------|
| **Infinite Combo** | Loops that can be repeated infinitely | Splinter Twin + Deceiver Exarch |
| **Two-Card Combo** | Two cards that win together | Channel + Fireball |
| **Engine Combo** | Cards that generate overwhelming advantage | Storm count + Grapeshot |

### 2.6 Hybrid Archetypes

#### Tempo (Aggro-Control)
> "The 'Tempo' (Aggro-Control) hybrid deck type is somewhat a blend and has a more smoothed out profile. It begins the game somewhere in the middle and gets stronger, but after some number of turns it normally tapers off again."

**Characteristics**:
- Cheap, efficient threats
- Cheap interaction (bounce, counterspells)
- Card draw to maintain momentum
- Typically 1-2 colors for mana consistency

#### Prison (Control-Combo)
> "'Prison decks' are a Control-Combo hybrid that aims for full control through resource denial via a 'Combo'."

**Characteristics**:
- Lock pieces that prevent opponent actions
- Resource denial (land destruction, discard)
- Simple but powerful combinations

### 2.7 Tribal

**Definition**: Decks built around creatures of a specific type that synergize together.

> "'Tribal' refers to a deck archetype that focuses the deck around creatures of a particular creature type. The goal of these decks is to use the abilities of these creatures in tandem with one another to make them more powerful than the creature cards would be on their own." — [PrintMTG](https://printmtg.com/what-is-a-tribal-deck-in-mtg/)

#### The "1+1=3" Principle
> "A common way these interactions are described is through the equation '1 + 1 = 3'. Though the creatures may be less powerful compared to other standalone creatures, the high density of creatures that share a type with it may allow it to have more impact upon the game."

#### Key Tribal Components
| Component | Description | Examples |
|-----------|-------------|----------|
| **Lords** | Creatures that boost their type | Goblin King, Elvish Archdruid |
| **Tribal Spells** | Non-creature tribal synergies | Kindred Charge, Coat of Arms |
| **Changelings** | Creatures with all types | Mirror Entity, Chameleon Colossus |
| **Universal Tribal Support** | Works with any chosen type | Vanquisher's Banner, Door of Destinies |

#### Popular Tribal Types

**Elves**
- Playstyle: Mana ramp, creature generation
- Strengths: Explosive mana production, go-wide strategies
- Key Cards: Llanowar Elves, Elvish Archdruid, Ezuri

**Goblins**
- Playstyle: Swarm tactics, token generation
- Strengths: Speed, explosive board states
- Key Cards: Krenko, Mob Boss; Goblin King; Impact Tremors

**Zombies**
- Playstyle: Recursion, graveyard synergy
- Strengths: Resilience to board wipes
- Key Cards: Wilhelt, the Rotcleaver; Gravecrawler

---

## 3. Card Synergy and Affinity

### 3.1 Defining Synergy

> "Synergy is defined as 'the interaction of two or more agents or forces so that their combined effect is greater than the sum of their individual effects.' In Magic, this translates to 'when a group of cards' combined properties/abilities work together to make a greater effect' – they help each other out instead of canceling each other out." — [MTG Salvation](https://www.mtgsalvation.com/forums/magic-fundamentals/magic-general/804337-synergy-in-decks-how-do-they-do-that)

### 3.2 Types of Synergy

| Type | Description | Example |
|------|-------------|---------|
| **Combo Synergy** | Cards that work together mechanically | Avaricious Dragon + Rakdos Pit Dragon (one discards, other benefits) |
| **Strategy Synergy** | Cards that support the same game plan | Aggro creatures + burn spells |
| **Mana Synergy** | Mana base supports all cards | Correct color ratios for spells |
| **Theme Synergy** | Cards that share a thematic element | Artifacts + artifact payoffs |

### 3.3 Affinity as a Mechanic and Synergy Example

#### The Affinity Keyword
> "A spell with 'Affinity for X' costs less to cast for each X permanent you have in play when casting the spell." — [Draftsim](https://draftsim.com/affinity-mtg/)

#### Building Around Affinity
The Affinity deck archetype demonstrates synergy principles:

| Card Type | Role | Synergy |
|-----------|------|---------|
| Artifact Lands | Mana + Artifact Count | Enable affinity, boost Cranial Plating |
| Frogmite/Myr Enforcer | Threats | Free with enough artifacts |
| Cranial Plating | Win Condition | Scales with artifact count |
| Thoughtcast | Card Draw | Cheap with artifacts |
| Arcbound Ravager | Sacrifice Outlet | Converts artifacts to power |

> "The core cards in an Affinity deck offer the most synergy and should not be cut. Springleaf Drum, for example, 'is the closest thing there is to another artifact land.'" — [Star City Games](https://articles.starcitygames.com/articles/affinity-primer/)

### 3.4 Synergy in Deckbuilding

#### Role of Synergy
> "Ultimately, synergy should be about editing a deck and finding ways to squeeze more flavor and more value out of every draw and every interaction, supporting the deck's goals, themes, and game plan." — [Brainstorm Brewery](https://brainstormbrewery.com/unified-theory-of-commander-synergy/)

#### The Synergy Trap
> "Synergy can become a trap. If you select cards for your deck based on synergy alone, but don't consider their place in the broader game plan of the deck, then you're losing value any time those brilliant interactions aren't possible."

#### Synergy Hierarchy
> "Synergy is just one element, and it's less important than having threats, answers, and the resources to use them. Decide what the deck is doing first, then use synergy as a tool to edit, not as your primary guiding principle."

### 3.5 Identifying Card Affinity

Cards have **affinity** for each other when they:

1. **Share mechanical themes** (e.g., +1/+1 counters, sacrifice triggers)
2. **Enable each other's conditions** (e.g., discard outlets + madness cards)
3. **Provide mutual protection** (e.g., counterspells + combo pieces)
4. **Create resource loops** (e.g., draw + recursion)
5. **Amplify each other's effects** (e.g., lords + tribal creatures)

---

## 4. Commander-Specific Deckbuilding Patterns

### 4.1 The 8x8 Theory

The 8x8 Theory provides a mathematical framework for Commander deckbuilding consistency.

#### Core Concept
> "You start with your commander and 35 land slots, choose 8 different kinds of effects you would like to see played in your deck, and then pick 8 individual cards for each of those effects, yielding a clean total of 64 spells." — [The 8x8 Theory](https://the8x8theory.tumblr.com/what-is-the-8x8-theory)

#### Purpose
> "The 8x8 Theory is not meant to be a set of rules each EDH decklist should follow, but rather an initial jumping-off point at the beginning of the deckbuilding process. The purpose of the 8x8 Theory is to give you a rough idea of building a deck with consistency in mind."

#### The "Rule of 8"
> "An oft-cited rule for EDH is the rule of 8. If you want a mechanic or interaction to be present in the deck, then include at least 8 cards that do the thing you want."

### 4.2 The Core Four Categories

According to the 8x8 Theory, four categories should be present in every Commander deck:

| Category | Purpose | Typical Count |
|----------|---------|---------------|
| **Ramp** | Accelerate mana production | 8-12 cards |
| **Draw** | Maintain card flow | 8-10 cards |
| **Removal** | Answer opponent threats | 8-10 cards |
| **Personal** | Deck-specific synergies | 8+ cards |

### 4.3 The Four Pillars of Commander Deckbuilding

> "Ramp and card draw are the two solutions that can have the biggest impact on deck performance. Along with removal and recursion, ramp and draw make up the 'Four Pillars of Good Deck Building' when it comes to Commander." — [Card Kingdom](https://blog.cardkingdom.com/whats-better-in-commander-card-draw-or-ramp/)

### 4.4 Ramp in Commander

#### Definition
> "Magic: The Gathering is fundamentally a game of resource management. Mana is one of those resources, and ramp means gathering more of it. Ramp also describes the strategy of outpacing opponents' mana production, then deploying threats they can't answer." — [EDHREC](https://edhrec.com/guides/the-edhrec-guide-to-ramp-in-commander)

#### Types of Ramp
| Type | Examples | Resilience |
|------|----------|------------|
| **Land Ramp** | Cultivate, Kodama's Reach | High (hard to remove) |
| **Mana Rocks** | Sol Ring, Arcane Signet | Medium (artifact removal) |
| **Mana Dorks** | Llanowar Elves, Birds of Paradise | Low (creature removal) |
| **Treasure Tokens** | Smothering Tithe, Dockside Extortionist | One-time use |

#### Recommended Counts
- **Lands**: 36-38 (starting point)
- **Ramp Spells**: 10-12
- **Total Mana Sources**: ~48-50 cards

### 4.5 Card Draw in Commander

#### Importance
> "By running enough card draw, you can stand to lower your overall redundancy of effects. Drawing more cards allows you to hit the key pieces you need more often — whether that's removal, recursion, or even ramp."

#### Unique Insight
> "Most players don't realize that only one of those four pillars can be increased without detriment to the others: card draw. Adding more card draw in place of any of the other categories has the least effect on your game plan."

### 4.6 The Command Zone Template

The Command Zone podcast published a deckbuilding template focusing on optimized category sizes:

| Category | Recommended Count |
|----------|------------------|
| Lands | 37-38 |
| Ramp | 10 |
| Card Draw | 10 |
| Single-Target Removal | 5 |
| Board Wipes | 3 |
| Win Conditions | Variable |

### 4.7 Rule of Thirds

An alternative deckbuilding approach:

| Category | Approximate Cards |
|----------|------------------|
| Theme/Win Condition | ~33 cards |
| Interaction/Support | ~33 cards |
| Mana Base | ~33 cards |

### 4.8 Commander-Specific Considerations

#### Color Identity
- All cards must match commander's color identity
- Affects available ramp, removal, and draw options
- Multi-color decks need careful mana base construction

#### Singleton Format
- Only one copy of each card (except basic lands)
- Increases need for redundancy in effects
- Card draw becomes more valuable

#### Multiplayer Dynamics
- Must consider multiple opponents
- Politics and threat assessment matter
- Board wipes gain value
- Single-target removal less efficient

---

## 5. Deckbuilding Heuristics from Experienced Players

### 5.1 Frank Karsten's Mathematical Approach

Frank Karsten, Pro Tour Hall of Famer (2009), is renowned for his mathematical analysis of deckbuilding.

#### Background
> "He is known as a very methodical and thorough strategist within the game, using his doctorate in mathematics to write many articles on deckbuilding probabilities." — [MTG Wiki](https://mtg.fandom.com/wiki/Frank_Karsten)

#### Key Contributions

**Mana Source Requirements**
For casting spells reliably in 60-card decks with 24 lands:

| Mana Cost | Required Sources |
|-----------|-----------------|
| C (1 colored) | 14 sources |
| CC (2 same color) | 20 sources |
| CCC (3 same color) | 23 sources |
| 1C | 13 sources |
| 2CC | 18 sources |

**Mana Curve Optimization**
Karsten's computer simulations determined optimal mana curve distributions based on land count and desired consistency.

### 5.2 General Deckbuilding Heuristics

#### The Deckbuilding Checklist
> "A deckbuilding checklist is a general list of minimum requirements a good deck should have, regardless of individual goals or themes. It makes sure your deck is consistent and complete, helping identify what your deck might be lacking." — [MTG Goldfish](https://www.mtggoldfish.com/articles/the-power-of-a-deckbuilding-checklist-commander-quickie)

#### Core Checklist Items

| Category | Question | Target |
|----------|----------|--------|
| **Win Condition** | How does this deck win? | Clear path to victory |
| **Consistency** | Will I see my key cards? | 8+ copies of effects (Rule of 8) |
| **Mana** | Can I cast my spells on curve? | Proper land/ramp ratio |
| **Interaction** | Can I stop opponents? | Sufficient removal |
| **Protection** | Can I protect my pieces? | Counterspells, hexproof, recursion |
| **Card Flow** | Will I run out of cards? | Adequate draw effects |

### 5.3 Redundancy Principle

For singleton formats like Commander:
- Run 3-4 cards with similar effects for consistency
- Tutors can substitute for redundancy
- Card draw reduces need for redundancy

### 5.4 Threat/Answer Balance

#### Guidelines by Archetype
| Archetype | Threats | Answers |
|-----------|---------|---------|
| Aggro | 70-80% | 20-30% |
| Midrange | 50-60% | 40-50% |
| Control | 20-30% | 70-80% |
| Combo | Variable (protect combo) | Variable |

### 5.5 Mana Base Construction

#### General Guidelines
- Dual lands improve consistency
- Avoid too many tapped lands in fast decks
- Color-intensive spells need more sources
- Utility lands have opportunity costs

#### Commander Specifics
- 3+ color decks need significant fixing
- Green excels at fixing (land ramp)
- Budget affects mana base quality significantly

### 5.6 Testing and Iteration

> "Playtest ~10–20 games and re-evaluate. A good mana curve makes your deck do useful things almost every turn." — [Draftsim](https://draftsim.com/mtg-mana-curve/)

#### Goldfish Testing
- Play the deck alone to check consistency
- Track turn-by-turn mana usage
- Note dead cards and awkward hands

#### Actual Gameplay Testing
- Adjust for real matchups
- Identify weaknesses
- Track win conditions achieved

---

## 6. Sources and Citations

### Primary Sources

1. [MTG Wiki - Mana Curve](https://mtg.fandom.com/wiki/Mana_curve)
2. [Draftsim - MTG Mana Curve](https://draftsim.com/mtg-mana-curve/)
3. [EDHREC - Commander Mana Curves for Beginners](https://edhrec.com/articles/commander-mana-curves-for-beginners)
4. [CBR - Aggro, Control, Combo, and Midrange Guide](https://www.cbr.com/mtg-guide-to-magics-biggest-archetypes/)
5. [MTG Wiki - Archetype](https://mtg.fandom.com/wiki/Archetype)
6. [MTG Salvation - Synergy: When Cards Work Together](https://www.mtgsalvation.com/articles/16328-synergy-when-cards-work-together)
7. [Star City Games - Building For Synergy In Commander](https://articles.starcitygames.com/articles/building-for-synergy-in-commander/)
8. [Brainstorm Brewery - Unified Theory of Commander: Synergy](https://brainstormbrewery.com/unified-theory-of-commander-synergy/)
9. [The 8x8 Theory](https://the8x8theory.tumblr.com/what-is-the-8x8-theory)
10. [EDH Wiki - 7 by 9](https://edh.fandom.com/wiki/7_by_9)
11. [EDHREC - The EDHREC Guide to Ramp in Commander](https://edhrec.com/guides/the-edhrec-guide-to-ramp-in-commander)
12. [Card Kingdom - What's Better in Commander: Card Draw or Ramp?](https://blog.cardkingdom.com/whats-better-in-commander-card-draw-or-ramp/)
13. [MTG Wiki - Frank Karsten](https://mtg.fandom.com/wiki/Frank_Karsten)
14. [MTG Goldfish - The Power of a Deckbuilding Checklist](https://www.mtggoldfish.com/articles/the-power-of-a-deckbuilding-checklist-commander-quickie)
15. [Wizards of the Coast - Tempo & Card Advantage](https://magic.wizards.com/en/news/feature/tempo-card-advantage-delicate-balance-2014-11-17)
16. [PrintMTG - What is a Tribal Deck in MTG?](https://printmtg.com/what-is-a-tribal-deck-in-mtg/)
17. [Draftsim - MTG Archetypes](https://draftsim.com/mtg-archetypes/)
18. [Star City Games - Affinity Primer](https://articles.starcitygames.com/articles/affinity-primer/)
19. [Draftsim - Affinity in MTG](https://draftsim.com/affinity-mtg/)
20. [EDHREC - Digital Deckbuilding - Card Packages and Staples](https://edhrec.com/articles/digital-deckbuilding-archidekt-card-packages-and-edhrec-staples)

### Additional Resources

- [EDHREC](https://edhrec.com/) - Commander deck data aggregation
- [MTG Goldfish](https://www.mtggoldfish.com/) - Deck metagame analysis
- [Moxfield](https://www.moxfield.com/) - Deckbuilding with packages
- [Archidekt](https://archidekt.com/) - Deckbuilding with category management

---

## Appendix: Quick Reference Tables

### A. Land Count by Format and Archetype

| Format | Aggro | Midrange | Control |
|--------|-------|----------|---------|
| Standard (60) | 20-22 | 23-25 | 24-27 |
| Modern (60) | 18-21 | 22-24 | 24-26 |
| Commander (100) | 32-35 | 36-38 | 37-40 |
| Limited (40) | 16-17 | 17 | 17-18 |

### B. Commander Category Targets

| Category | Minimum | Recommended | Maximum |
|----------|---------|-------------|---------|
| Lands | 33 | 37 | 40 |
| Ramp | 8 | 10-12 | 15 |
| Card Draw | 5 | 8-10 | 12 |
| Removal | 8 | 10 | 12 |
| Board Wipes | 2 | 3-4 | 5 |
| Win Conditions | 3 | 5-8 | 10 |

### C. Archetype Matchup Matrix

|   | Aggro | Control | Combo | Midrange |
|---|-------|---------|-------|----------|
| **Aggro** | - | Favored | Unfavored | Even |
| **Control** | Unfavored | - | Favored | Even |
| **Combo** | Favored | Unfavored | - | Even |
| **Midrange** | Even | Even | Even | - |

---

*Document compiled: February 7, 2026*
*Research scope: MTG deckbuilding theory, archetypes, synergy, Commander patterns, and expert heuristics*
