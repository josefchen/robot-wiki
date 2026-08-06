# Robotics / Embodied-AI Market Map
_Research snapshot: 2026-08-06_

## Executive summary

- **Record capital inflows.** Global robotics startup funding hit $18.8B in H1 2026 alone, already exceeding the $15B raised in all of 2025 and the $14.1B peak of 2021 (Crunchbase, Jun 2026). The shift is driven by embodied AI — VLA models replacing pre-programmed behavior — not traditional industrial automation.
- **Foundation model companies are the hottest sub-sector.** Physical Intelligence ($5.6B valuation, Nov 2025), Skild AI ($14B, Jan 2026), Rhoda AI ($1.7B, Mar 2026), and Generalist AI ($2B, Jun 2026) raised mega-rounds at pre-revenue or early-pilot stages, betting that a generalist "robot brain" will be the Android of robotics.
- **Humanoids dominate the narrative but not the revenue.** Figure AI's $39B valuation is the largest pre-revenue bet in the sector, but verified deployments remain thin: Figure has ~740 robots operating internally (Jun 2026), BMW Spartanburg is a pilot, and the "robot vs intern" package-sorting race (May 2026) showed the robot performing at 98.5% of human speed — impressive but not autonomous at scale.
- **China is the scale leader in humanoid units.** Unitree sold 5,500 humanoids in 2025 (vs. Tesla's zero commercial sales), is the first profitable humanoid company at scale, and filed for a ~$618M Shanghai STAR Market IPO (pricing Aug 2026). UBTech shipped 1,000 Walker S2 units to active factories. China accounts for >43% of global robotics venture investment in 2026 (Crunchbase).
- **The China/US bifurcation is real and structural.** US companies lead in foundation models and capital efficiency per unit; Chinese companies lead in hardware cost, manufacturing scale, and component supply chain. Unitree's humanoid ASP dropped from ~$85K (2023) to ~$25K (2025) with ~60% gross margin via vertical integration. US humanoids remain 5-10x more expensive.
- **Most humanoid deployments are still demos or pilots.** The credible deployments with verified scale are: UBTech Walker S2 at Airbus/factories (1,000 units), Unitree G1 in education/research (74% of 2025 sales), Agility Digit at GXO/Amazon (pilot scale), and Figure 02 at BMW (pilot). "Industrial use" for Unitree humanoids is 50-70% corporate tour guides (Rest of World, Mar 2026).
- **The bear case is credible.** Unitree's own prospectus admits "uncertainties" around demand and applications. Q1 2026 net profit halved due to competition and R&D costs (Reuters, Jun 2026). Most humanoid companies are pre-profit; UBTech has run at a loss since at least 2020. Bain Capital Ventures' Ajay Agarwal argues humanoids are a "parlor trick" and that wheels/wings are more efficient than walking.
- **Value accrual is contested.** The bull case says foundation model companies (Skild, Physical Intelligence) become the "Android of robotics" — a platform layer capturing most value. The bear case says hardware integration and data ownership (Amazon, Tesla, Hyundai) capture value because physical deployment is the moat, not software.
- **Consolidation is accelerating.** SoftBank acquired ABB Robotics ($5.4B, Oct 2025), Berkshire Grey (2023), and has stakes in multiple humanoid companies. Meta acquired Assured Robot Intelligence (May 2026). Symbotic acquired Fox Robotics (Feb 2026). Skild AI acquired Zebra Technologies' robotics automation business (Apr 2026). Caterpillar acquired Monarch Tractor (Apr 2026). Serve Robotics acquired Diligent Robotics (Jan 2026). iRobot went bankrupt and was acquired by Picea (Dec 2025). K-Scale Labs shut down (Nov 2025).
- **NVIDIA is the kingmaker.** Its Isaac GR00T platform, Jetson Thor compute, Cosmos world models, and reference humanoid robot design make it the default infrastructure layer. Nearly every major humanoid and foundation model company has NVIDIA as an investor or partner. Google DeepMind's Gemini Robotics models are the credible alternative.
- **The "hands problem" remains the hardest bottleneck.** Dexterous manipulation is unsolved at human-level. Sharpa (22-DoF hands, mass production), Shadow Robot, and Wonik are the leading hand specialists. NVIDIA's reference robot uses Sharpa hands. Tactile sensing (XELA Robotics) is still early.
- **Data is the new bottleneck.** Companies are paying people to film chores (Encord, Micro1). XDOF raised $70M for teleoperation infrastructure. The gap between demo videos and reliable real-world deployment remains wide — Bessemer calls it the "GPT-2.5 moment."
- **Defense robotics is a parallel boom.** Saronic ($1.75B Series D, $9.25B valuation) and Anduril ($61B valuation) show that autonomous military systems are attracting the largest checks, though they are adjacent to the embodied AI core.
- **Japan is mobilizing.** A ¥1T physical AI initiative to deploy 10M robots by 2040 was announced (Forbes, Jul 2026). Mitsubishi is converting an idle engine plant to produce 1,000 humanoids/month. Mujin plans a 2030 IPO.
- **South Korea's Samsung/LG humanoid push.** Samsung made Rainbow Robotics a subsidiary (Jan 2025) and restructured its robotics unit (Jul 2026). LG is also investing in humanoid robots as its next growth category.

## Segment taxonomy

```
robotics-embodied-ai
├── foundation-models
│   ├── generalist-manipulation-policies   (Physical Intelligence, Skild AI, Generalist AI, Dyna, Covariant, Genesis AI, Assured Robot Intelligence)
│   ├── video-prediction-world-models      (Rhoda AI)
│   ├── navigation-mobility                (Field AI)
│   ├── home-robot-policies                 (Sunday Robotics)
│   ├── industrial-robotics                (Mind Robotics)
│   └── dexterous-manipulation             (Eka Robotics)
├── humanoids
│   ├── industrial-humanoids                (Figure, Apptronik, Agility, Tesla, Boston Dynamics, Unitree, UBTech, Galbot, AgiBot, NEURA, Humanoid UK, Spirit AI, Galaxea, EngineAI, TARS, Deep Robotics, Persona AI, Rainbow Robotics, Astribot, Booster, Kepler, Mitsubishi)
│   ├── home-humanoids                     (1X, X Square, Sunday)
│   ├── care-companion-humanoids           (Fourier)
│   ├── exoskeleton-mobility               (Wandercraft)
│   └── research-humanoids                  (Clone, Mentee, Hanson, Leju, K-Scale)
├── industrial-logistics
│   ├── warehouse-automation                (Symbotic, Amazon Robotics, Nimble, Mujin, Berkshire Grey, Mytra, Zebra)
│   ├── piece-picking                       (RightHand, Ambi, Plus One)
│   ├── mobile-robots                       (Locus, Fox Robotics)
│   ├── truck-loading                        (Dexterity)
│   └── industrial-robots                   (ABB, Robotphoenix)
├── vertical-applications
│   ├── agriculture                          (Carbon Robotics, Monarch, Farm-ng)
│   ├── construction                         (Bedrock Robotics)
│   ├── food-kitchen                         (Chef Robotics, Miso Robotics)
│   ├── retail                              (Simbe)
│   ├── surgical                             (Intuitive, CMR, Moon Surgical)
│   ├── healthcare                           (Diligent Robotics)
│   ├── delivery                             (Nuro, Serve, Starship, Coco)
│   ├── lab-automation                       (Automata, Lila Sciences)
│   ├── consumer-home                       (The Bot Company, Weave, iRobot, SwitchBot)
│   ├── cleaning                             (Avidbots, Brain Corp)
│   ├── security                             (Knightscope)
│   ├── industrial-cobots                    (Standard Bots, Collaborative Robotics, Formic, Foundry)
│   ├── inspection                           (Gecko Robotics)
│   └── defense                              (Saronic, Anduril)
├── simulation-tooling
│   ├── simulation-platforms                (NVIDIA, Applied Intuition)
│   ├── foundation-models                   (Google DeepMind, OpenAI, Meta)
│   ├── data-collection                      (XDOF, Encord, Micro1)
│   └── open-source-frameworks              (Hugging Face LeRobot, Pollen Robotics)
└── components-hardware
    ├── actuators-reducers                   (Harmonic Drive, Nabtesco, Leaderdrive)
    ├── actuators-components                  (Sanhua)
    ├── dexterous-hands                      (Shadow Robot, Sharpa, Wonik)
    └── tactile-sensors                      (XELA Robotics)
```

## Segments

### Foundation Models

The most capital-intensive and contested segment. Companies here bet that a general-purpose "robot brain" — a VLA (vision-language-action) model trained across embodiments — will become the platform layer of robotics, analogous to Android for mobile. The technical approaches diverge: Physical Intelligence uses flow-matching action experts and real-world RL (π*0.6); Skild AI pursues "omni-bodied intelligence" across all data sources; Rhoda AI trains on internet video with direct video-action prediction; Genesis AI uses synthetic data from a proprietary physics engine.

**Who leads:** Physical Intelligence ($5.6B valuation, CapitalG-led) and Skild AI ($14B, SoftBank-led) are the most capitalized. Skild's acquisition of Zebra Technologies' robotics automation business (Apr 2026) signals a land-grab for deployment channels. Google DeepMind's Gemini Robotics 2 (Jul 2026) is the most credible platform-level competitor, demonstrated on Apptronik's Apollo 2 with whole-body control.

**The bet:** If foundation models commoditize hardware, the model layer captures most value. If hardware integration and data ownership are the moat, then vertically integrated players (Tesla, Unitree, Figure) win and foundation model companies become middleware.

**Unit economics:** Unknown. All major foundation model companies are pre-revenue or early-pilot. Skild's Foxconn deployment and Skild's Zebra acquisition are the first revenue signals.

#### Companies

**Physical Intelligence** — San Francisco, US. Founded 2024. Builds π0-series VLA models with flow-matching action experts and cross-embodiment training. Latest: $600M Series B (Nov 2025) at $5.6B post-money, led by CapitalG. Total raised ~$1.67B. Open-sourced openpi. Deployed across multiple robot embodiments in pilots. Source: [Bloomberg](https://www.bloomberg.com/news/articles/2025-11-20/robotics-startup-physical-intelligence-valued-at-5-6-billion-in-funding-round). Confidence: high.

**Skild AI** — Pittsburgh, US. Founded 2023. Builds "omni-bodied" foundation model for any robot. Latest: $1.4B Series C (Jan 2026) at >$14B, led by SoftBank. Acquired Zebra Technologies' robotics automation business (Apr 2026). Deployed on Foxconn Blackwell assembly lines with Nvidia. Source: [TechCrunch](https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/). Confidence: high.

**Generalist AI** — San Mateo, US. Latest: $400M round (Jun 2026) at $2B, led by Radical Ventures. In talks for $3B valuation (Jul 2026, 8VC expected to lead). Source: [Bloomberg](https://www.bloomberg.com/news/articles/2026-06-04/nvidia-backed-robotics-startup-generalist-ai-valued-at-2-billion). Confidence: high.

**Dyna Robotics** — Redwood City, US. Founded 2024. Builds DYNA-1 for repetitive manual tasks. $120M Series A (Sep 2025) at >$600M, led by Robostrategy/CRV/First Round. Total ~$143.5M. Source: [Bloomberg](https://www.bloomberg.com/news/articles/2025-09-15/dyna-robotics-raises-120-million-in-funding-from-nvidia-amazon). Confidence: high.

**Sunday Robotics** — Mountain View, US. Builds Memo home robot. $165M Series B (Mar 2026) at $1.15B, led by Coatue. Trained on 10M+ real-world household episodes via Skill Capture Glove. Beta deployments fall 2026. Source: [TechCrunch](https://techcrunch.com/2026/03/12/humanoid-robotics-maker-sunday-reaches-1-15b-valuation/). Confidence: high.

**Field AI** — Irvine, US. Builds field foundation models for unstructured environments. $405M (Aug 2025) at $2B. Backed by Nvidia, Bill Gates, Jeff Bezos family office. Source: [CNBC](https://www.cnbc.com/2025/08/20/gates-nvidia-fieldai-robotics.html). Confidence: high.

**Covariant** — Berkeley, US. Founded 2017. Founders (Pieter Abbeel, Peter Chen, Rocky Duan) and ~25% of staff acqui-hired by Amazon (Aug 2024) with non-exclusive license to robotic foundation models. Status: acquired. Source: [Amazon](https://www.aboutamazon.com/news/company-news/amazon-covariant-ai-robots). Confidence: high.

**Genesis AI** — Paris, FR. $105M seed (Jul 2025), backed by Eclipse and Khosla. Launched GENE-26.5 model and Eno robot (May 2026). Uses proprietary physics simulation engine for synthetic training data. Source: [TechCrunch](https://techcrunch.com/2026/05/06/khosla-backed-robotics-startup-genesis-ai-has-gone-full-stack/). Confidence: high.

**Rhoda AI** — Palo Alto, US. $450M Series A (Mar 2026) at $1.7B. Uses internet video for "Direct Video-Action" training. Source: [Reuters](https://www.reuters.com/technology/rhoda-ai-raises-450-million-17-billion-valuation/). Confidence: high.

**Mind Robotics** — Palo Alto, US. Rivian spinout (RJ Scaringe). $500M Series A (Mar 2026) at $2B, co-led by Accel and a16z. $400M follow-on (May 2026) at $3.4B, led by Kleiner Perkins. Targets Rivian factory deployment. Source: [TechCrunch](https://techcrunch.com/2026/03/11/rivian-mind-robotics-series-a-500m-fund-raise/). Confidence: high.

### Humanoids

The most capital-intensive and media-visible segment. Humanoids attract outsized funding because they promise to replace human labor across any task — a multi-trillion-dollar TAM if achievable. The technical approaches split between full-stack companies (Figure, Tesla, Unitree, UBTech) that build both hardware and software, and software-first companies (Skild, Physical Intelligence) that aim to be the brain for any humanoid.

**Who leads (by verified deployment):**
- **Unitree** is the unit leader: 5,500 humanoids sold in 2025, ~33% of global humanoid sales, profitable ($90M adjusted net profit on $250M revenue). But 74% of sales are for education/research, and "industrial use" is mostly corporate tour guides.
- **UBTech** is the factory deployment leader: 1,000 Walker S2 units produced, Airbus deal, China-Vietnam border customs deployment.
- **Figure** is the valuation leader ($39B) with the most polished demos and BMW pilot, but ~740 robots operating internally as of Jun 2026.
- **Agility** is the US deployment leader with GXO, Amazon, and Schaeffler pilots, going public via SPAC at $2.5B.
- **Apptronik** ($5.5B) has Mercedes-Benz and GXO pilots, powered by Google DeepMind Gemini Robotics.

**The China cohort is serious:** Unitree, UBTech, Galbot, AgiBot, Spirit AI, Galaxea, EngineAI, TARS, X Square, Deep Robotics, Astribot, and others represent >100 companies (Counterpoint Research). The Chinese government has set mass production targets and established a National Humanoid Robot Innovation Center. The supply chain (Leaderdrive reducers, Sanhua actuators) is increasingly domestic.

**The bear case:** Unitree's prospectus admits demand uncertainty. Q1 2026 net profit halved. Most humanoids are deployed in demos or low-value tasks (tour guides, research). The gap between choreographed videos and reliable autonomous operation remains wide. Unit pricing is dropping but still $25K+ per unit with unclear ROI for most industrial tasks.

#### Companies

**Figure AI** — San Jose, US. Founded 2022. Figure 01-03 robots, Helix VLA model. $1B+ Series C (Sep 2025) at $39B. Total ~$1.9B. BMW Spartanburg pilot. ~740 robots operating internally (Jun 2026). Source: [Figure AI](https://www.figure.ai/news/series-c). Confidence: high.

**1X Technologies** — Oslo, NO. Founded 2014. NEO home humanoid ($20K pre-order). $100M Series B (Jan 2024) at $500M. Targeting $1B raise at $10B (Sep 2025, status unclear). Source: [1X](https://www.1x.tech/discover/1x-secures-100m-in-series-b-funding). Confidence: medium.

**Agility Robotics** — Salem, US. Founded 2015. Digit for warehouse logistics. SPAC merger with Churchill Capital Corp XI (Jun 2026) at $2.5B. Deployments at GXO, Amazon, Schaeffler, Toyota. Total ~$641M. Source: [Agility Robotics](https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital). Confidence: high.

**Apptronik** — Austin, US. Founded 2016. Apollo humanoid, powered by Google DeepMind. $520M Series A extension (Feb 2026) at $5.5B. Total ~$935M. Pilots at Mercedes-Benz, GXO, Jabil. Source: [CNBC](https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html). Confidence: high.

**Tesla (Optimus)** — Austin, US. Founded 2003. Optimus Gen 3 in internal testing. Several hundred units in Tesla factories. Production targeted late July 2026 at Fremont (Model S/X line conversion). 50-100K target for 2026. No commercial sales. Source: [Electrek](https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/). Confidence: medium.

**Boston Dynamics** — Waltham, US. Founded 1992. Electric Atlas for industrial deployment. Hyundai subsidiary (acquired ~$1.1B, 2021). Hyundai committed 25,000 Atlas robots to own factories. Google DeepMind partnership. Source: [Boston Dynamics](https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/). Confidence: high.

**Unitree Robotics** — Hangzhou, CN. Founded 2017. G1/H1 humanoids, quadrupeds. IPO on Shanghai STAR Market (Aug 2026), ~$618M raise at ~$6.2B base valuation. 2025 revenue: $250M (1.71B yuan). 5,500 humanoids sold. First profitable humanoid company at scale. Source: [Rest of World](https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/). Confidence: high.

**UBTECH Robotics** — Shenzhen, CN. Founded 2012. Walker S2 industrial humanoid. IPO on HKEX (Dec 2023). ~$5B+ valuation. 1,000 Walker S2 produced. Airbus deal. Total raised ~$940M+. Source: [PR Newswire](https://www.prnewswire.com/news-releases/ubtech-humanoid-robot-walker-s2-begins-mass-production-and-delivery). Confidence: high.

**Fourier** — Shanghai, CN. Founded 2015. GR-1/2/3 humanoids from rehab exoskeleton heritage. GR-3 debuted at CES 2026 with DeepSeek partnership. Total ~$109M. Series E (2024) at ~$800M. Source: [aifunding.me](https://aifunding.me/companies/fourier-intelligence). Confidence: medium.

**Galbot** — Beijing, CN. Founded 2023. G1 humanoid with embodied multimodal large model. Total ~$800M. Latest: $300M+ (Dec 2025). Deployed at CATL battery factory. Source: [Yahoo Finance](https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html). Confidence: high.

**AgiBot (Zhiyuan Robot)** — Suzhou, CN. Founded 2023. A2-series humanoids. Backdoor listing via Swancor Advanced Materials ($290M for 63.62% stake, Jul 2025). A2 completed 66-mile walking record. Total disclosed ~$83.8M. Source: [SCMP](https://www.scmp.com/tech/big-tech/article/3317741/robot-maker-agibot-seeks-stake-shanghai-listed-firm-potential-backdoor-listing). Confidence: medium.

**Sanctuary AI** — Vancouver, CA. Founded 2018. Phoenix humanoid with hydraulic hands. Pivoted to AI software for third-party robots (2026). Total ~$140M. Source: [RoboZaps](https://blog.robozaps.com/b/sanctuary-ai-phoenix-review). Confidence: medium.

**NEURA Robotics** — Metzingen, DE. Founded 2019. 4NE-1 humanoid, cognitive robots. $1.4B Series C (Jun 2026), led by Tether with Nvidia, Amazon, Qualcomm, Bosch. Source: [NEURA Robotics](https://neura-robotics.com/record-series-c/). Confidence: high.

**Humanoid (UK)** — London, UK. Founded 2024. Industrial humanoid robots. $152M Series A (Jul 2026) at $1.35B. Backed by Prime Movers Lab, Schaeffler, Bosch. Source: [Reuters](https://www.reuters.com/business/robotics-startup-humanoid-raises-152-million-series-a-round-1-35-billion-valuation/). Confidence: high.

### Industrial / Logistics / Warehouse Automation

The most revenue-generating segment. These companies have real customers, real revenue, and in some cases real profits. The AI layer is increasingly important — Amazon's Blue Jay and Project Eluna represent the frontier of agentic AI in warehouse operations.

**Who leads:** Symbotic (public, $22.5B backlog, primarily Walmart) and Amazon Robotics (1M+ robots, internal) dominate by scale. Nimble ($1B valuation, FedEx-backed) and Dexterity ($1.65B) represent the AI-native entrants. Mujin ($1B+ valuation, 2030 IPO target) leads in Japan.

**Dynamics:** The segment is consolidating. Symbotic acquired Fox Robotics (Feb 2026). Skild AI acquired Zebra's robotics business (Apr 2026). SoftBank acquired ABB Robotics ($5.4B, Oct 2025) and Berkshire Grey (2023). The piece-picking sub-segment (RightHand, Ambi, Plus One) is mature but faces disruption from VLA-based approaches.

#### Companies

**Symbotic** — Wilmington, US. Founded 2007. Public (Nasdaq: SYM). AI-driven warehouse automation. $22.5B backlog. Acquired Fox Robotics (Feb 2026). Q3 FY2026 revenue ~$715M. Source: [Seeking Alpha](https://seekingalpha.com/article/4924767-symbotic-compelling-growth-story-but-at-the-wrong-price). Confidence: high.

**Dexterity** — Dover, US. Founded 2019. AI-powered Mech for truck loading/unloading. $95M (Mar 2025) at $1.65B. Total ~$296M. Source: [TechCrunch](https://techcrunch.com/2025/03/11/yet-another-ai-robotics-firm-lands-major-funding/). Confidence: high.

**Amazon Robotics** — Seattle, US. 1M+ robot fleet. Blue Jay multi-arm picking (Oct 2025). Project Eluna agentic AI. Acquired Covariant founders (Aug 2024). Source: [Amazon](https://www.aboutamazon.com/news/operations/new-robots-amazon-fulfillment-agentic-ai). Confidence: high.

**Nimble** — San Francisco, US. Founded 2017. Fully autonomous fulfillment 3PL. $106M Series C (Sep 2024) at $1B, led by FedEx. 2025 revenue tripled YoY. Source: [Nimble](https://nimble.ai/news/nimble-closes-106-million-series-c-funding-round-at-1b-valuation). Confidence: high.

**Locus Robotics** — Wilmington, US. Founded 2014. AMRs for warehouse fulfillment. $117M Series F (Dec 2022). Acquired Nexera Robotics (May 2026). Source: [DC Velocity](https://www.dcvelocity.com/editorial/featured/locus-robotics-acquires-nexera-robotics/). Confidence: medium.

**Mujin** — Tokyo, JP. Founded 2011. Robot software for factory/logistics. $233M Series D (Dec 2025) at >$1B. IPO target 2030. Source: [Bloomberg](https://www.bloomberg.com/news/articles/2026-06-10/factory-robot-startup-mujin-targets-growth-with-new-funding-eyes-ipo). Confidence: high.

**Berkshire Grey** — Bedford, US. Founded 2013. Acquired by SoftBank (2023). FedEx partnership (2026). Source: [Berkshire Grey](https://www.berkshiregrey.com/resources/press-release/berkshire-grey-enters-into-definitive-merger-agreement-with-softbank). Confidence: high.

### Vertical Applications

The most diverse segment, spanning agriculture, construction, food, retail, surgical, healthcare, delivery, lab automation, consumer/home, cleaning, security, and defense. These companies solve specific problems in specific industries, and their unit economics are more knowable than humanoid companies.

**Agriculture:** Carbon Robotics (LaserWeeder, $276M total) is the leader. Monarch Tractor burned through ~$250M, had mass layoffs, and was acquired by Caterpillar (Apr 2026) — a cautionary tale.

**Construction:** Bedrock Robotics ($350M total, $1.75B valuation, ex-Waymo founders) is the standout, automating excavators with supervised autonomy.

**Surgical:** Intuitive Surgical (da Vinci 5) remains the dominant player. CMR Surgical (Versius) and Moon Surgical (Maestro) are challengers. Medtronic Hugo and J&J Ottava are also competing.

**Delivery:** Nuro pivoted from custom delivery robots to AI-first autonomous driving licensing ($203M Series E, Mar 2026). Serve Robotics acquired Diligent Robotics (Jan 2026) for hospital logistics.

**Consumer/Home:** The Bot Company (Kyle Vogt, $4B valuation) and Sunday Robotics ($1.15B) are the best-funded home robot startups. iRobot went bankrupt (Dec 2025) and was acquired by Picea. K-Scale Labs shut down (Nov 2025).

**Defense:** Saronic ($9.25B valuation, autonomous ships) and Anduril ($61B valuation) are the leaders, though adjacent to the embodied AI core.

#### Notable companies

**Carbon Robotics** — Seattle, US. Founded 2018. LaserWeeder + Carbon Autonomy. Total ~$276M. Backed by NVIDIA NVentures. Source: [GeekWire](https://www.geekwire.com/2025/carbon-robotics-raises-20m-as-laserweeder-maker-plans-secretive-new-ai-robot-for-farms/). Confidence: medium.

**Bedrock Robotics** — US. Founded 2024. Autonomous construction equipment. $270M Series B (Feb 2026) at $1.75B. Total ~$350M. Ex-Waymo founders. Source: [Construction Dive](https://www.constructiondive.com/news/bedrock-robotics-raise-ai-automation-funding/745817/). Confidence: high.

**Intuitive Surgical** — Sunnyvale, US. Founded 1995. Public (Nasdaq: ISRG). da Vinci 5. Dominant surgical robotics market leader. Source: [Intuitive](https://isrg.intuitive.com/news-releases/news-release-details/intuitive-announces-second-quarter-earnings). Confidence: high.

**Nuro** — Mountain View, US. Founded 2016. Autonomous driving for delivery, pivoting to licensing. $203M Series E (Mar 2026) at $6B. Lucid Motors robotaxi partnership. Source: [Nuro](https://www.nuro.ai/blog/nuro-closes-203-million-series-e-financing-to-advance-its-ai-first). Confidence: high.

**The Bot Company** — San Francisco, US. Founded 2024. Wheeled home robot. $250M (Oct 2025) at $4B. Led by Greenoaks. Founded by Kyle Vogt (Cruise/Twitch). Source: [Bloomberg](https://www.bloomberg.com/news/articles/2025-10-28/cruise-founder-kyle-vogt-s-robotics-startup-eyes-4-billion-valuation). Confidence: high.

**Gecko Robotics** — Pittsburgh, US. Founded 2013. Infrastructure inspection robots. $125M (Jun 2025) at $1.25B. Largest-ever Navy contract (2026). Source: [CNBC](https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html). Confidence: high.

### Simulation, Tooling, and Infrastructure

NVIDIA is the dominant player with Isaac Sim/Lab, GR00T, Jetson Thor, and Cosmos. Its Isaac GR00T Reference Humanoid Robot (May 2026, Computex Taipei) combines a Unitree H2 Plus body with Sharpa hands — an "Android-like" reference design for the ecosystem.

Google DeepMind's Gemini Robotics 2 (Jul 2026) is the most credible alternative, with whole-body control, multi-finger dexterity, and on-device inference. Demonstrated on Apptronik Apollo 2.

OpenAI re-entered robotics (2025-2026) with a hiring push across hardware, simulation, and ML. Meta acquired Assured Robot Intelligence (May 2026) for its Superintelligence Labs.

**Data is the new bottleneck.** XDOF ($70M, Jun 2026) builds teleoperation infrastructure. Encord and Micro1 provide data collection and annotation services. Companies are paying people to film themselves doing chores for robot training data (Business Insider, Oct 2025).

**Open source:** Hugging Face's LeRobot and Pollen Robotics' Reachy Mini ($300) are democratizing robotics research. K-Scale Labs open-sourced all IP after shutting down.

#### Companies

**NVIDIA** — Santa Clara, US. Founded 1993. Public. Isaac Sim/Lab, GR00T, Jetson Thor, Cosmos, Reference Humanoid Robot. Partner/investor in most major robotics companies. Source: [NVIDIA](https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design). Confidence: high.

**Google DeepMind (Robotics)** — Mountain View, US. Gemini Robotics 1.5/2, On-Device. Whole-body humanoid control. Demonstrated on Apptronik Apollo 2 and Boston Dynamics Atlas. Source: [DeepMind](https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/). Confidence: high.

**Applied Intuition** — Mountain View, US. Founded 2017. $600M Series F (Jun 2025) at $15B. Simulation/validation for automotive and defense. Expanding into robotics with Dana natural-language service. Source: [Applied Intuition](https://www.appliedintuition.com/blog/series-f). Confidence: high.

**Hugging Face (LeRobot)** — New York, US. Founded 2016. Open-source robotics platform. Reachy Mini ($300). Source: [Hugging Face](https://huggingface.co/blog/reachy-mini). Confidence: high.

**XDOF** — US. $70M (Jun 2026). Teleoperation and data collection infrastructure for robot foundation models. Source: [TechCrunch](https://techcrunch.com/2026/06/17/collecting-robot-training-data-is-dirty-unglamorous-work/). Confidence: high.

### Components and Hardware Supply Chain

The humanoid supply chain is a critical bottleneck and a significant cost driver. The key components are actuators/reducers (joints), dexterous hands, tactile sensors, and batteries.

**Actuators/Reducers:** Harmonic Drive Systems (Japan, public) and Nabtesco (Japan, public) form a duopoly in precision strain-wave gearing. Chinese alternatives like Leaderdrive are rising on domestic demand. Sanhua supplies thermal management and actuator components to Tesla ($685M order reported).

**The China concentration story:** China accounts for 70% of global robot installations (roboticscenter.ai). The supply chain for screws, reducers, motors, and dexterous hands is increasingly concentrated in China. Unitree self-develops and manufactures core components, giving it a ~60% gross margin at $25K ASP. ~20% of Unitree's supply chain is imported (including Nvidia chips).

**Dexterous Hands:** Sharpa (Singapore, 22-DoF, mass production) is the leading startup, used in NVIDIA's reference robot. Shadow Robot (UK) is the research standard. Wonik (Korea, Allegro Hand) is established.

**Tactile Sensors:** XELA Robotics (Japan) provides 3D tactile sensors. Figure 03 has fingertip tactile sensors detecting forces as low as 3 grams.

#### Companies

**Harmonic Drive Systems** — Tokyo, JP. Founded 1970. Public (TYO: 6324). Global leader in strain-wave gearing. Source: [NextFinancial](https://nextfinancial.substack.com/p/the-joint-problem-who-owns-the-most). Confidence: high.

**Sharpa** — Singapore. SharpaWave dexterous hands (22 DoF, tactile sensing). Mass production achieved (Dec 2025). Used in NVIDIA GR00T Reference Robot. Unveiled North full-body robot at CES 2026. Source: [Sharpa](https://www.sharpa.com/). Confidence: high.

**Leaderdrive** — Suzhou, CN. Harmonic reducers for Chinese humanoid manufacturers. Rising on domestic substitution demand. Source: [Humanoid Guide](https://humanoid.guide/leaderdrive-harmonic-reducers-surge-as-humanoid-demand). Confidence: medium.

## Funding timeline

| Date | Company | Round | Amount | Valuation | Lead investors | Source |
|------|---------|-------|--------|-----------|----------------|--------|
| Feb 2024 | Figure AI | Series B | $675M | $2.6B | Microsoft, NVIDIA, OpenAI, Jeff Bezos | [CNBC](https://www.cnbc.com/2024/02/29/robot-startup-figure-valued-at-2point6-billion-by-bezos-amazon-nvidia.html) |
| Jan 2024 | 1X Technologies | Series B | $100M | $500M | OpenAI, EQT Ventures | [1X](https://www.1x.tech/discover/1x-secures-100m-in-series-b-funding) |
| Aug 2024 | Covariant | Acqui-hire | — | — | Amazon | [Amazon](https://www.aboutamazon.com/news/company-news/amazon-covariant-ai-robots) |
| Jun 2025 | Applied Intuition | Series F | $600M | $15B | BlackRock, Kleiner Perkins | [Applied Intuition](https://www.appliedintuition.com/blog/series-f) |
| Jun 2025 | Gecko Robotics | — | $125M | $1.25B | — | [CNBC](https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html) |
| Jul 2025 | Genesis AI | Seed | $105M | — | Eclipse, Khosla Ventures | [TechCrunch](https://techcrunch.com/2026/05/06/khosla-backed-robotics-startup-genesis-ai-has-gone-full-stack/) |
| Aug 2025 | Field AI | — | $405M | $2B | — | [CNBC](https://www.cnbc.com/2025/08/20/gates-nvidia-fieldai-robotics.html) |
| Sep 2025 | Figure AI | Series C | $1B+ | $39B | Brookfield, NVIDIA, Qualcomm, Salesforce, T-Mobile | [Figure AI](https://www.figure.ai/news/series-c) |
| Sep 2025 | Dyna Robotics | Series A | $120M | $600M | Robostrategy, CRV, First Round | [Bloomberg](https://www.bloomberg.com/news/articles/2025-09-15/dyna-robotics-raises-120-million-in-funding-from-nvidia-amazon) |
| Oct 2025 | ABB Robotics | Acquisition | $5.4B | — | SoftBank Group | [CNA](https://www.channelnewsasia.com/business/softbank-buy-abbs-robotics-business-54-billion-deal) |
| Oct 2025 | The Bot Company | — | $250M | $4B | Greenoaks | [Bloomberg](https://www.bloomberg.com/news/articles/2025-10-28/cruise-founder-kyle-vogt-s-robotics-startup-eyes-4-billion-valuation) |
| Nov 2025 | Physical Intelligence | Series B | $600M | $5.6B | CapitalG | [Bloomberg](https://www.bloomberg.com/news/articles/2025-11-20/robotics-startup-physical-intelligence-valued-at-5-6-billion-in-funding-round) |
| Dec 2025 | iRobot | Bankruptcy/Acquisition | — | — | Picea Robotics | [Reuters](https://www.reuters.com/technology/irobot-enters-chapter-11-lender-acquire-roomba/) |
| Dec 2025 | Mujin | Series D | $233M | $1B+ | — | [Bloomberg](https://www.bloomberg.com/news/articles/2026-06-10/factory-robot-startup-mujin-targets-growth-with-new-funding-eyes-ipo) |
| Dec 2025 | Galbot | — | $300M+ | — | — | [Yahoo Finance](https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html) |
| Jan 2026 | Skild AI | Series C | $1.4B | $14B | SoftBank Group | [TechCrunch](https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/) |
| Feb 2026 | Apptronik | Series A ext. | $520M | $5.5B | B Capital, Google, Mercedes-Benz | [CNBC](https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html) |
| Feb 2026 | Bedrock Robotics | Series B | $270M | $1.75B | — | [Construction Dive](https://www.constructiondive.com/news/bedrock-robotics-raise-ai-automation-funding/745817/) |
| Feb 2026 | Symbotic | Acquisition | — | — | (acquired Fox Robotics) | [Robot Report](https://www.therobotreport.com/symbotic-acquires-autonomous-forklift-maker-fox-robotics/) |
| Mar 2026 | Agility Robotics | SPAC | — | $2.5B | Churchill Capital Corp XI | [Agility](https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital) |
| Mar 2026 | Rhoda AI | Series A | $450M | $1.7B | — | [Reuters](https://www.reuters.com/technology/rhoda-ai-raises-450-million-17-billion-valuation/) |
| Mar 2026 | Mind Robotics | Series A | $500M | $2B | Accel, a16z | [TechCrunch](https://techcrunch.com/2026/03/11/rivian-mind-robotics-series-a-500m-fund-raise/) |
| Mar 2026 | Sunday Robotics | Series B | $165M | $1.15B | Coatue | [TechCrunch](https://techcrunch.com/2026/03/12/humanoid-robotics-maker-sunday-reaches-1-15b-valuation/) |
| Mar 2026 | Nuro | Series E | $203M | $6B | — | [Nuro](https://www.nuro.ai/blog/nuro-closes-203-million-series-e-financing-to-advance-its-ai-first) |
| Mar 2026 | Saronic | Series D | $1.75B | $9.25B | Kleiner Perkins | [Crunchbase](https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/) |
| Apr 2026 | Skild AI | Acquisition | — | — | (acquired Zebra robotics) | [Zebra](https://www.zebra.com/us/en/about-zebra/newsroom/press-releases/2026/skild-ai-acquires-zebra-technologies--robotics-automation-busine.html) |
| Apr 2026 | Caterpillar | Acquisition | — | — | (acquired Monarch Tractor) | [TTNews](https://www.ttnews.com/articles/caterpillar-acquires-monarch) |
| May 2026 | Mind Robotics | — | $400M | $3.4B | Kleiner Perkins | [Reuters](https://www.reuters.com/legal/transactional/rivian-spinout-mind-robotics-valued-3-4-billion-new-funding/) |
| May 2026 | Meta | Acquisition | — | — | (acquired Assured Robot Intelligence) | [TechCrunch](https://techcrunch.com/2026/05/01/meta-buys-robotics-startup-to-bolster-its-humanoid-ai-ambitions/) |
| May 2026 | EngineAI | Series B | $200M | $1.5B | Henan CICC, Luxshare-ICT | [Crunchbase](https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/) |
| May 2026 | TARS Robotics | Seed | $513M | $1.9B | Hillhouse Capital, HSG | [Crunchbase](https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/) |
| Jun 2026 | Generalist AI | — | $400M | $2B | Radical Ventures | [Bloomberg](https://www.bloomberg.com/news/articles/2026-06-04/nvidia-backed-robotics-startup-generalist-ai-valued-at-2-billion) |
| Jun 2026 | NEURA Robotics | Series C | $1.4B | — | Tether | [NEURA Robotics](https://neura-robotics.com/record-series-c/) |
| Jun 2026 | XDOF | — | $70M | — | — | [TechCrunch](https://techcrunch.com/2026/06/17/collecting-robot-training-data-is-dirty-unglamorous-work/) |
| Jun 2026 | X Square Robot | Series B | $276M | — | Xiaomi, HongShan | [Caixin](https://www.caixinglobal.com/2026-04-21/x-square-robot-raises-new-funds-targets-home-trials-by-may/) |
| Jul 2026 | Humanoid (UK) | Series A | $152M | $1.35B | Prime Movers Lab, Schaeffler, Bosch | [Reuters](https://www.reuters.com/business/robotics-startup-humanoid-raises-152-million-series-a-round-1-35-billion-valuation/) |
| Aug 2026 | Unitree Robotics | IPO | ~$618M | ~$6.2B | — | [Caixin](https://www.caixinglobal.com/2026-07-31/robotics-startup-unitree-launches-620-million-star-market-ipo/) |

## Most active investors

| Investor | Notable embodied-AI positions | Thesis | Source |
|----------|-------------------------------|-------|-------|
| NVIDIA (NVentures) | Physical Intelligence, Skild AI, Figure AI, Apptronik, NEURA Robotics, Field AI, Carbon Robotics, Generalist AI | Platform play: be the Android of robotics via Isaac GR00T, Jetson Thor, Cosmos | [TechCrunch](https://techcrunch.com/2026/01/05/nvidia-wants-to-be-the-android-of-generalist-robotics/) |
| SoftBank Group | Skild AI, Berkshire Grey, ABB Robotics, Symbotic | Mega-bets on physical AI infrastructure and humanoid brains | [Bloomberg](https://www.bloomberg.com/news/articles/2026-01-14/robotics-startup-skild-valued-above-14-billion-after-softbank-led/) |
| Khosla Ventures | Physical Intelligence, Field AI, Genesis AI | "Almost everybody in the 2030s will have a humanoid robot at home" — Vinod Khosla | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Eclipse | Bedrock Robotics, Genesis AI, Simbe Robotics, Mytra | Physical economy gap between digital and real world | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Greenoaks | The Bot Company, Mytra, Mind Robotics, Physical Intelligence | Concentrated long-term bets on exceptional teams | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| DCVC | Agility Robotics, Slip Robotics, Fulfil, AIM | Deep tech: "delivering existentially necessary results in the physical world" | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Founders Fund | Physical Intelligence, Anduril, Gecko Robotics, Hadrian | Hardware + AI systems for national interest | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Lightspeed | Skild AI, Dexterity | General-purpose robotics needs specific skills first, then convergence | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Lux Capital | Applied Intuition, Physical Intelligence, Formic | "Zeitgeist reminds me of self-driving cars in 2012" | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Sequoia | Neros, Mach Industries, AMP | "Hardware Manifesto": major software shifts depend on hardware breakthroughs | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| HSG (HongShan) | TARS Robotics, Robot Era, X Square Robot | Most active investor in China robotics by deal count (6 deals in 2026) | [Crunchbase](https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/) |
| CapitalG | Physical Intelligence | Growth-stage bets on category-defining AI companies | [Bloomberg](https://www.bloomberg.com/news/articles/2025-11-20/robotics-startup-physical-intelligence-valued-at-5-6-billion-in-funding-round) |
| Coatue | Sunday Robotics | Consumer robotics with mass-market potential | [TechCrunch](https://techcrunch.com/2026/03/12/humanoid-robotics-maker-sunday-reaches-1-15b-valuation/) |
| Kleiner Perkins | Saronic, Mind Robotics, Applied Intuition | Large bets on defense and industrial robotics | [Crunchbase](https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/) |
| Accel | Mind Robotics | Industrial robotics with factory data advantage | [TechCrunch](https://techcrunch.com/2026/03/11/rivian-mind-robotics-series-a-500m-fund-raise/) |
| Conviction (Sarah Guo) | Sunday Robotics | "Completely cracked researchers + commitment to deployed products" | [Business Insider](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6) |
| Tether | NEURA Robotics | Largest single robotics investment ($1.4B Series C lead) | [NEURA Robotics](https://neura-robotics.com/record-series-c/) |

## Consolidation and dead pool

| Company | Outcome | Date | Source |
|---------|---------|------|--------|
| Covariant | Acqui-hire by Amazon (founders + ~25% staff, non-exclusive license) | Aug 2024 | [Amazon](https://www.aboutamazon.com/news/company-news/amazon-covariant-ai-robots) |
| Berkshire Grey | Acquired by SoftBank, taken private | 2023 | [Berkshire Grey](https://www.berkshiregrey.com/resources/press-release/berkshire-grey-enters-into-definitive-merger-agreement-with-softbank) |
| ABB Robotics | Robotics business acquired by SoftBank for $5.4B | Oct 2025 | [CNA](https://www.channelnewsasia.com/business/softbank-buy-abbs-robotics-business-54-billion-deal) |
| iRobot | Chapter 11 bankruptcy, acquired by Picea Robotics (Chinese manufacturer) | Dec 2025 | [Reuters](https://www.reuters.com/technology/irobot-enters-chapter-11-lender-acquire-roomba/) |
| K-Scale Labs | Shut down, all IP open-sourced, deposits refunded | Nov 2025 | [Humanoids Daily](https://www.humanoidsdaily.com/news/k-scale-labs-cancels-k-bot-orders-open-sources-all-ip-after-funding) |
| Monarch Tractor | Mass layoffs, acquired by Caterpillar | Apr 2026 | [TTNews](https://www.ttnews.com/articles/caterpillar-acquires-monarch) |
| Fox Robotics | Acquired by Symbotic | Feb 2026 | [Robot Report](https://www.therobotreport.com/symbotic-acquires-autonomous-forklift-maker-fox-robotics/) |
| Zebra Technologies (Robotics) | Robotics automation business sold to Skild AI | Apr 2026 | [Zebra](https://www.zebra.com/us/en/about-zebra/newsroom/press-releases/2026/skild-ai-acquires-zebra-technologies--robotics-automation-busine.html) |
| Assured Robot Intelligence | Acquired by Meta for Superintelligence Labs | May 2026 | [TechCrunch](https://techcrunch.com/2026/05/01/meta-buys-robotics-startup-to-bolster-its-humanoid-ai-ambitions/) |
| Diligent Robotics | Acquired by Serve Robotics | Jan 2026 | [Robot Report](https://www.therobotreport.com/serve-robotics-to-acquire-hospital-logistics-provider-diligent-robotics/) |
| Rainbow Robotics | Samsung became largest shareholder (35%), subsidiary | Jan 2025 | [Samsung](https://news.samsung.com/global/samsung-electronics-to-become-largest-shareholder-in-rainbow-robotics) |
| AgiBot | Backdoor listing via controlling stake in Swancor Advanced Materials | Jul 2025 | [SCMP](https://www.scmp.com/tech/big-tech/article/3317741/robot-maker-agibot-seeks-stake-shanghai-listed-firm-potential-backdoor-listing) |
| Robotphoenix | IPO on HKEX (~$86M raised) | May 2026 | [Crunchbase](https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/) |
| Amazon-iRobot merger | Abandoned (regulatory block, EU/UK) | Jan 2024 | [Humanoid Index](https://humanoidindex.org/funding) |

## Market structure analysis

### Where value accrues

The central question in embodied AI is whether value accrues to the **model layer** (foundation model companies like Skild and Physical Intelligence), the **hardware layer** (vertically integrated humanoid makers like Tesla, Unitree, Figure), the **integration layer** (warehouse automation companies like Symbotic and Amazon Robotics), or the **data layer** (companies with unique real-world deployment data).

**The bull case for the model layer:** If VLA models become the "Android of robotics," foundation model companies capture platform economics — every robot maker licenses their brain. NVIDIA's strategy (Isaac GR00T as open platform) and Skild's acquisition of Zebra's robotics business support this thesis. The model layer has the highest gross margins and lowest capital intensity.

**The bear case for the model layer:** Physical deployment is the moat, not software. Amazon, Tesla, and Hyundai (Boston Dynamics) own their hardware, their data, and their deployment channels. They can train their own models. Foundation model companies risk becoming middleware — necessary but not valuable. Bain Capital's Ajay Agarwal argues humanoids are a "parlor trick" and that specialized robots (wheels, wings) are more efficient.

**The integration layer is where revenue is real today:** Symbotic ($22.5B backlog), Amazon Robotics (1M+ robots), and the entire warehouse automation segment have verifiable revenue and customers. The humanoid companies are mostly pre-revenue or early-pilot.

### Vertical vs. horizontal split

The market is splitting between:
1. **Horizontal foundation model companies** (Physical Intelligence, Skild, Genesis AI, Rhoda AI) that aim to be the brain for any robot.
2. **Vertical humanoid companies** (Figure, Tesla, Unitree, UBTech) that build full-stack hardware + software.
3. **Vertical application companies** (Carbon Robotics, Bedrock, Chef Robotics) that solve specific problems in specific industries.

The horizontal-vertical tension is unresolved. Skild's acquisition of Zebra's robotics business suggests horizontal companies are moving vertical to capture deployment channels. Figure's decision to drop OpenAI and build in-house Helix models suggests vertical companies are moving horizontal to own the brain.

### Why humanoids attract capital

Humanoids attract outsized capital because:
- **TAM argument:** If a humanoid can do any human task, the TAM is all human labor (~$40T globally).
- **Form factor:** Humanoid robots can operate in environments built for humans (stairs, doorways, tools) without retrofitting.
- **Demo appeal:** Humanoid videos go viral in ways that warehouse AMRs do not.
- **Founder cult:** Brett Adcock (Figure), Elon Musk (Tesla), and Wang Xingxing (Unitree) attract investor following.

The counter-argument: specialized robots are more efficient for specific tasks. Wheels beat legs for warehouse transport. Arms on rails beat humanoids for pick-and-place. The capital flowing to humanoids may be misallocated.

### The China/US bifurcation

**US leads in:** Foundation models (Physical Intelligence, Skild, Genesis AI, Rhoda AI), capital efficiency per unit (Figure's $39B valuation), and platform infrastructure (NVIDIA, Google DeepMind).

**China leads in:** Hardware cost (Unitree $25K ASP vs. $50K+ for US humanoids), manufacturing scale (5,500 humanoids sold in 2025), component supply chain (Leaderdrive reducers, Sanhua actuators), and government coordination (National Humanoid Robot Innovation Center, mass production targets).

**The structural divide:** US companies depend on NVIDIA chips and Japanese reducers. Chinese companies are building domestic alternatives but still import ~20% of supply chain (including NVIDIA chips, per Unitree prospectus). US export controls and geopolitical tensions create a bifurcated market. FCC banned future foreign robot vacuums from US sale (Jul 2026), signaling the direction.

### Credible bear cases

1. **Demand uncertainty:** Unitree's own prospectus admits "uncertainties surrounding demand and applications." Q1 2026 net profit halved. Most humanoid deployments are research/education (74% for Unitree) or corporate tour guides.
2. **Unit economics unproven:** No humanoid company has demonstrated positive unit economics at commercial scale. Unitree is profitable but primarily on quadrupeds and actuators, not humanoids.
3. **The "hands problem" is unsolved:** Dexterous manipulation at human level remains the hardest bottleneck. No company has demonstrated reliable human-level hand performance in unstructured environments.
4. **Data gap:** The gap between demo videos and reliable real-world deployment is wide. Bessemer calls it the "GPT-2.5 moment" — models are improving but not yet reliable.
5. **Hardware tourist investors:** Industry veterans warn that "hardware tourists" are flooding cap tables, underestimating hardware difficulty (Business Insider, Jun 2026). Red Glass Ventures' Bilal Zuberi says "my yellow flags are up. The space is overheated."
6. **Competition from specialized robots:** Wheels, wings, and fixed arms are more efficient than walking for most tasks. The humanoid form factor may be suboptimal for most industrial applications.
7. **Regulatory and safety risk:** Figure's former head of product safety sued the company (Nov 2025) alleging the robots are strong enough to fracture a human skull. Safety standards for human-robot interaction in unstructured environments are nascent.

## Coverage gaps and low-confidence entries

- **1X Technologies:** The reported $1B raise at $10B valuation (Sep 2025) could not be confirmed as closed. Listed as medium confidence. The last confirmed round was $100M Series B at $500M (Jan 2024).
- **Kepler Robot, LimX Dynamics, Leju Robotics, PaXini, Hanson Robotics, Booster Robotics, SwitchBot, Clone Robotics, Mentee Robotics:** Funding and deployment data are primarily from Humanoid Index, a secondary aggregator. Listed as low confidence. Could not verify with primary sources.
- **RightHand Robotics, Ambi Robotics, Plus One Robotics, Simbe Robotics, Miso Robotics, Starship Technologies, Coco, Knightscope, Brain Corp, Farm-ng:** Funding details are incomplete or unverified. Total raised figures are from Tracxn/Crunchbase profiles and may not reflect latest rounds.
- **Spirit AI, Galaxea AI, EngineAI, TARS Robotics, X Square Robot, RobotEra:** Funding data from Crunchbase News article (Jun 2026) — amounts and valuations are from a single secondary source.
- **Eka Robotics, Foundry Robotics, Mytra, Formic:** Known primarily from investor profiles in Business Insider. Funding amounts undisclosed.
- **Moon Surgical, CMR Surgical:** Funding details not verified. Company descriptions from a surgical robotics overview blog post.
- **Sanhua:** The $685M Tesla order figure is from a secondary source (36kr) and could not be independently verified.
- **Deep Robotics:** Total raised figure combines Humanoid Index ($140M) with the $70M Dec 2025 raise from Yahoo Finance. The total may be higher.
- **Fourier Intelligence:** Total raised ($109M) is from aifunding.me. The Series E amount and exact date could not be verified. The company rebranded from "Fourier Intelligence" to "Fourier" and split into Fourier (humanoids) + Fourier Rehab.
- **Galbot total raised ($800M):** This figure comes from the company's own announcement ("bringing the company's total funding to $800 million"). Individual round breakdowns beyond the $300M Dec 2025 round are not fully verified.
- **Anduril valuation ($61B):** From Business Insider investor profile. The exact date and round of this valuation could not be verified.
- **Mitsubishi humanoid production:** From a single Interesting Engineering report. The specific model and commercial timeline could not be verified.
- **Several Chinese humanoid companies** (Galaxea AI, Spirit AI, TARS, EngineAI, X Square) have raised very large rounds very quickly (2025-2026) but have minimal public information about their technology, teams, or deployments beyond funding announcements.

## Source list

Key primary and reputable secondary sources used:

1. Crunchbase News — [Robotics funding surge 2026](https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/) and [China embodied AI funding](https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/)
2. Business Insider — [22 Investors to Know in Robotics and Physical AI](https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6)
3. Rest of World — [Unitree IPO prospectus analysis](https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/)
4. Reuters — Multiple company funding and acquisition reports
5. Bloomberg — Multiple company funding and valuation reports
6. TechCrunch — Multiple company funding and strategy reports
7. CNBC — Multiple company funding reports
8. The Robot Report — Multiple industry reports
9. Wikipedia — [Figure AI](https://en.wikipedia.org/wiki/Figure_AI)
10. Humanoid Index — [Funding Tracker](https://humanoidindex.org/funding)
11. NVIDIA News — [Isaac GR00T Reference Robot](https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design)
12. Google DeepMind — [Gemini Robotics 2](https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/)
13. Physical Intelligence — [π*0.6 blog](https://www.pi.website/blog/pistar06)
14. Skild AI — [Series C announcement](https://www.skild.ai/blogs/series-c)
15. Figure AI — [Series C announcement](https://www.figure.ai/news/series-c)
16. Apptronik — [Series A announcement](https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a)
17. NEURA Robotics — [Series C announcement](https://neura-robotics.com/record-series-c/)
18. Agility Robotics — [SPAC merger announcement](https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital)
19. Caixin Global — [Unitree IPO](https://www.caixinglobal.com/2026-07-31/robotics-startup-unitree-launches-620-million-star-market-ipo/) and [X Square Robot](https://www.caixinglobal.com/2026-04-21/x-square-robot-raises-new-funds-targets-home-trials-by-may/)
20. New York Times — [China's robots and Unitree IPO](https://www.nytimes.com/2026/08/06/business/china-unitree-ipo-robot.html)
21. Forbes — [Unitree IPO benchmark](https://www.forbes.com/sites/jonmarkman/2026/07/30/unitrees-ipo-will-set-the-first-public-robot-valuation-benchmark/)
22. Electrek — [Tesla Optimus production](https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/)
23. Boston Dynamics — [Atlas unveiling](https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/)
24. Amazon — [Blue Jay and Project Eluna](https://www.aboutamazon.com/news/operations/new-robots-amazon-fulfillment-agentic-ai)
25. Symbotic — [Fox Robotics acquisition](https://www.therobotreport.com/symbotic-acquires-autonomous-forklift-maker-fox-robotics/)
26. Zebra Technologies — [Skild AI acquisition](https://www.zebra.com/us/en/about-zebra/newsroom/press-releases/2026/skild-ai-acquires-zebra-technologies--robotics-automation-busine.html)
27. Sharpa — [Mass production](https://www.sharpa.com/)
28. Hugging Face — [Reachy Mini](https://huggingface.co/blog/reachy-mini)
29. Applied Intuition — [Series F](https://www.appliedintuition.com/blog/series-f)
30. McKinsey — [Humanoid supply chain](https://www.mckinsey.com/industries/industrials/our-insights/turning-humanoid)
