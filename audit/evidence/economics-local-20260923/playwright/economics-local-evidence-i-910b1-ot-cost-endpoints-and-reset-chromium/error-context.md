# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: economics-local-evidence.spec.ts >> industrial52 actual default robot-cost endpoints and reset
- Location: tests/e2e/economics-local-evidence.spec.ts:19:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "5.0%"
Received: "5%"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - link "Robot Wiki" [ref=e7] [cursor=pointer]:
          - /url: /
        - search "Site search" [ref=e8]:
          - generic [ref=e9]: Search
          - generic [ref=e10]:
            - searchbox "Search" [ref=e11]
            - button "Search the wiki" [ref=e12]
        - navigation "Robot Wiki taxonomy" [ref=e15]:
          - list [ref=e16]:
            - listitem [ref=e17]:
              - button "Manipulation & Learned Policies" [ref=e18]
            - listitem [ref=e22]:
              - button "RL, Sim-to-Real & Locomotion" [ref=e23]
            - listitem [ref=e27]:
              - button "World Models" [ref=e28]
            - listitem [ref=e32]:
              - button "Data, Hardware & Evaluation" [expanded] [ref=e33]
              - list [ref=e37]:
                - listitem [ref=e38]:
                  - link "Domain overview" [ref=e39] [cursor=pointer]:
                    - /url: /data-hardware/
                - listitem [ref=e40]:
                  - link "The Data Bottleneck" [ref=e41] [cursor=pointer]:
                    - /url: /data-hardware/data-bottleneck/
                - listitem [ref=e42]:
                  - link "Major Datasets" [ref=e43] [cursor=pointer]:
                    - /url: /data-hardware/datasets/
                - listitem [ref=e44]:
                  - link "Hardware Taxonomy" [ref=e45] [cursor=pointer]:
                    - /url: /data-hardware/hardware-taxonomy/
                - listitem [ref=e46]:
                  - link "Teleoperation Rigs" [ref=e47] [cursor=pointer]:
                    - /url: /data-hardware/teleop-rigs/
                - listitem [ref=e48]:
                  - link "The Evaluation Crisis" [ref=e49] [cursor=pointer]:
                    - /url: /data-hardware/evaluation-crisis/
                - listitem [ref=e50]:
                  - link "Industrial Deployment" [ref=e51] [cursor=pointer]:
                    - /url: /data-hardware/industrial-deployment/
            - listitem [ref=e52]:
              - button "Classical Foundations" [ref=e53]
            - listitem [ref=e57]:
              - button "Frontier & Open Problems" [ref=e58]
            - listitem [ref=e62]:
              - button "Adjacent Domains" [ref=e63]
          - list [ref=e67]:
            - listitem [ref=e68]:
              - link "A-Z Index" [ref=e69] [cursor=pointer]:
                - /url: /a-z/
            - listitem [ref=e70]:
              - link "Market Map" [ref=e71] [cursor=pointer]:
                - /url: /market-map/
            - listitem [ref=e72]:
              - link "Playground" [ref=e73] [cursor=pointer]:
                - /url: /playground/
            - listitem [ref=e74]:
              - link "Glossary" [ref=e75] [cursor=pointer]:
                - /url: /glossary/
            - listitem [ref=e76]:
              - link "Credits" [ref=e77] [cursor=pointer]:
                - /url: /credits/
    - generic [ref=e78]:
      - main [ref=e79]:
        - article [ref=e80]:
          - navigation "Breadcrumb" [ref=e81]:
            - list [ref=e82]:
              - listitem [ref=e83]:
                - link "Home" [ref=e84] [cursor=pointer]:
                  - /url: /
                - generic [ref=e85]: /
              - listitem [ref=e86]:
                - link "Data, Hardware & Evaluation" [ref=e87] [cursor=pointer]:
                  - /url: /data-hardware/
                - generic [ref=e88]: /
              - listitem [ref=e89]:
                - generic [ref=e90]: Industrial Deployment
          - generic [ref=e91]:
            - heading "Industrial Deployment" [level=1] [ref=e92]
            - paragraph [ref=e93]: The installed base robot learning is trying to enter, and the jam-rate arithmetic that decides whether a 99 percent cell ships.
            - generic [ref=e94]:
              - generic [ref=e95]:
                - term [ref=e96]: Last reviewed
                - definition [ref=e97]:
                  - time [ref=e98]: 22 August 2026
              - generic [ref=e99]:
                - term [ref=e100]: Reading time
                - definition [ref=e101]: 13 min
              - generic [ref=e102]:
                - term [ref=e103]: Citations
                - definition [ref=e104]: "22"
          - generic [ref=e105]:
            - paragraph [ref=e106]:
              - text: IFR's World Robotics 2025 reports a global operational stock of 4,663,698 industrial robots in 2024; annual installations exceeded 500,000 in each year from 2021 through 2024, with 542,076 installed in 2024
              - generic [ref=e107]:
                - generic [ref=e109]:
                  - link "Müller 2025" [ref=e110] [cursor=pointer]:
                    - /url: https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf
                  - link "Jump to the full reference for World Robotics 2025 – Industrial Robots" [ref=e111] [cursor=pointer]:
                    - /url: "#ref-ifr-world-robotics-2025"
                    - generic [ref=e112]: ↓
                - text: .
              - text: Those machines are the field robot learning is trying to enter, and almost nothing about how they got there resembles the pipeline a paper describes. In 2024, China had 2,027,190 industrial robots in operation and Japan had 450,530. China had about 4.5 times the stock of Japan, the second-ranked country, and received 295,045 new installations that year, reported as 54 percent of the global total. IFR's May 5, 2026 release repeats the rounded stock and installation-share figures from World Robotics 2025
              - generic [ref=e115]:
                - link "Müller 2025" [ref=e116] [cursor=pointer]:
                  - /url: https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf
                - link "Jump to the full reference for World Robotics 2025 – Industrial Robots" [ref=e117] [cursor=pointer]:
                  - /url: "#ref-ifr-world-robotics-2025"
                  - generic [ref=e118]: ↓
              - generic [ref=e119]:
                - generic [ref=e121]:
                  - link "International Federation of Robotics 2026" [ref=e122] [cursor=pointer]:
                    - /url: https://ifr.org/ifr-press-releases/news/china-makes-ai-powered-robots-core-of-national-strategy
                  - link "Jump to the full reference for China Makes AI-powered Robots Core of National Strategy" [ref=e123] [cursor=pointer]:
                    - /url: "#ref-ifr-china-five-year-plan-2026"
                    - generic [ref=e124]: ↓
                - text: .
              - text: By customer industry in 2024, electrical/electronics accounted for 128,899 installations (reported as 24 percent), automotive for 126,088, and metal and machinery for 88,777 (16 percent). The IFR summary gives automotive 23 percent on page 13 but 24 percent on page 16; its chart and automotive discussion both report 126,088 units. These are customer-industry categories, not application families. IFR says the customer industry was unspecified for 14 percent of installations
              - generic [ref=e127]:
                - link "Müller 2025" [ref=e128] [cursor=pointer]:
                  - /url: https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf
                - link "Jump to the full reference for World Robotics 2025 – Industrial Robots" [ref=e129] [cursor=pointer]:
                  - /url: "#ref-ifr-world-robotics-2025"
                  - generic [ref=e130]: ↓
              - text: ". The humanoid programmes this site follows count deployments in pilots and hundreds of hours: Unitree claims roughly 5,500 humanoid units shipped across 2025"
              - generic [ref=e131]:
                - generic [ref=e133]:
                  - link "Noreika 2026" [ref=e134] [cursor=pointer]:
                    - /url: https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/
                  - 'link "Jump to the full reference for Humanoid Robots in 2026: What Is Actually Deployed" [ref=e135] [cursor=pointer]':
                    - /url: "#ref-technology-org-deployed-2026"
                    - generic [ref=e136]: ↓
                - text: ","
              - text: a count Omdia puts nearer 4,200 while ranking AgiBot first
              - generic [ref=e137]:
                - generic [ref=e139]:
                  - link "RoboZaps 2026" [ref=e140] [cursor=pointer]:
                    - /url: https://blog.robozaps.com/b/best-humanoid-robots
                  - link "Jump to the full reference for 38 Best Humanoid Robots in 2026" [ref=e141] [cursor=pointer]:
                    - /url: "#ref-robozaps-humanoids-2026"
                    - generic [ref=e142]: ↓
                - text: .
              - text: The industrial market installs a hundred times either figure every year. This page is that field.
            - generic [ref=e143]:
              - generic [ref=e144]:
                - generic [ref=e145]: 4,663,698
                - generic [ref=e146]: operational stock
                - generic [ref=e147]: industrial robots worldwide, 2024
              - generic [ref=e148]:
                - generic [ref=e149]: 542,076
                - generic [ref=e150]: 2024 installations
                - generic [ref=e151]: 2021–2024 each above 500k
              - generic [ref=e152]:
                - generic [ref=e153]: 54%
                - generic [ref=e154]: China share
                - generic [ref=e155]: of global installations in 2024
              - generic [ref=e156]:
                - generic [ref=e157]: ~5,500
                - generic [ref=e158]: humanoid units 2025
                - generic [ref=e159]: Unitree, its own figure
            - heading "The economics you can drag" [level=2] [ref=e160]:
              - link "The economics you can drag" [ref=e161] [cursor=pointer]:
                - /url: "#the-economics-you-can-drag"
              - button "Copy link to this section, The economics you can drag" [ref=e163] [cursor=pointer]
            - paragraph [ref=e166]:
              - text: "Before the survey, hold the economics in your hands: every section below argues about one ratio or another. Drag the"
              - strong [ref=e167]: per-pick success
              - text: slider from 99.9 down to 99 percent and watch the payback readout barely move. Now drag
              - strong [ref=e168]: jam-clearing time
              - text: "toward five minutes and do it again: the same 0.9 point drop adds five months to the payback and cuts the cell's hourly output by nearly a third. That asymmetry, not the success rate itself, decides deployment, and no paragraph teaches it as fast as the dial."
            - generic [ref=e169]:
              - generic [ref=e170]:
                - paragraph [ref=e171]: Cell economics calculator
                - button "Reset" [ref=e172]
              - generic [ref=e173]:
                - generic [ref=e174]:
                  - generic [ref=e175]:
                    - text: Robot cost
                    - generic [ref=e176]: $80k
                  - slider "Robot cost, currently $80k" [ref=e177]: "80000"
                  - paragraph [ref=e178]: "Assumption: $80k is a chosen example, not a sourced arm-price quote. EVST gives complete-cell budgets, not fixed list prices."
                - generic [ref=e179]:
                  - generic [ref=e180]:
                    - text: Integration multiple
                    - generic [ref=e181]: 2.5x
                  - slider "Integration multiple, currently 2.5x" [ref=e182]: "2.5"
                  - paragraph [ref=e183]: "Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell."
                - generic [ref=e184]:
                  - generic [ref=e185]:
                    - text: Cycle time
                    - generic [ref=e186]: 6.0 s
                  - slider "Cycle time, currently 6.0 s" [ref=e187]: "6"
                  - paragraph [ref=e188]: "Assumption: a paced piece-picking cycle; drag it to match any quoted cell."
                - generic [ref=e189]:
                  - generic [ref=e190]:
                    - text: Uptime
                    - generic [ref=e191]: 95.0%
                  - slider "Uptime, currently 95.0%" [ref=e192]: "95"
                  - paragraph [ref=e193]: "Assumption: availability net of maintenance and faults; 95% is a working figure, not a vendor claim."
                - generic [ref=e194]:
                  - generic [ref=e195]:
                    - text: Per-pick success
                    - generic [ref=e196]: 99.9%
                  - slider "Per-pick success, currently 99.9%" [ref=e197]: "99.9"
                  - paragraph [ref=e198]: "Assumption: the policy headline number; the demonstration teaching step drops this to 99."
                - generic [ref=e199]:
                  - generic [ref=e200]:
                    - text: Jam-clearing time
                    - generic [ref=e201]: 15 s
                  - slider "Jam-clearing time, currently 15 s" [ref=e202]: "15"
                  - paragraph [ref=e203]: "Assumption: seconds of human attention per failed pick; this dial is the whole argument."
                - generic [ref=e204]:
                  - generic [ref=e205]:
                    - text: Displaced wage
                    - generic [ref=e206]: $25/h
                  - slider "Displaced wage, currently $25/h" [ref=e207]: "25"
                  - paragraph [ref=e208]: "Assumption: fully loaded picker wage; set it to your own facility number."
              - generic [ref=e209]:
                - generic [ref=e210]:
                  - paragraph [ref=e211]: Cost per pick
                  - paragraph [ref=e212]:
                    - text: "0.008"
                    - generic [ref=e213]: USD over 5 yr
                - generic [ref=e214]:
                  - paragraph [ref=e215]: Payback
                  - paragraph [ref=e216]: 11.6 months
                - generic [ref=e217]:
                  - paragraph [ref=e218]: Verdict
                  - paragraph [ref=e219]:
                    - generic [ref=e220]: Pays back inside 24 months
                - paragraph [ref=e222]: Cell cost $200,000; 569 modeled picks per elapsed hour and 415,062 per 730-hour month; jam rate 0.10%. All seven defaults and slider ranges are authored assumptions; EVST’s guide supplies context, not exact inputs; none is a measured deployment result.
              - generic [ref=e223]:
                - paragraph [ref=e224]: Where each elapsed hour goes
                - 'img "Time breakdown per elapsed hour: 94.8% productive cycles, 0.2% jam clearing, 5.0% downtime" [ref=e225]':
                  - generic "Productive cycles" [ref=e226]
                  - generic "Jam clearing" [ref=e227]
                  - generic "Downtime" [ref=e228]
                - generic [ref=e229]:
                  - generic [ref=e230]: productive 3411 s
                  - generic [ref=e231]: jam clearing 9 s
                  - generic [ref=e232]: downtime 180 s
                - paragraph [ref=e233]: One elapsed hour is 3600 seconds; the three shares sum to it at every control setting.
            - paragraph [ref=e234]: "This calculator is an authored worked example, not a measured deployment or financial forecast. Its 80,000 USD robot cost is not a sourced arm-price quote; the 20,000 to 250,000 USD range and 5,000 USD step are chosen controls. All seven defaults, ranges and steps are authored assumptions: a 2.5 integration multiple, 6-second cycle, 95 percent uptime, 99.9 percent per-pick success, 15-second jam clearing and 25 USD hourly wage accompany that robot cost. The model also chooses 730 hours per month, a 60-month amortization period and a chosen 24-month verdict horizon. Throughput is modeled picks per elapsed hour, including downtime. Payback divides cell capital by modeled monthly labour value; it does not add damage or throughput savings."
            - paragraph [ref=e235]:
              - text: "EVST supplies vendor context, not those exact inputs: its guide describes complete-cell budgets, explicitly does not publish fixed list prices, and places the robot at a third to half of total cost"
              - generic [ref=e236]:
                - generic [ref=e238]:
                  - link "EVST Engineering Team 2026" [ref=e239] [cursor=pointer]:
                    - /url: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
                  - 'link "Jump to the full reference for Palletizing Robot Cost & ROI 2026: Price & Payback Guide" [ref=e240] [cursor=pointer]':
                    - /url: "#ref-evst-cell-cost-2026"
                    - generic [ref=e241]: ↓
                - text: .
              - text: Its payback guidance is 12 to 24 months for multi-shift cells, extending toward 24 to 36 months for single-shift or lower-throughput operations
              - generic [ref=e242]:
                - generic [ref=e244]:
                  - link "EVST Engineering Team 2026" [ref=e245] [cursor=pointer]:
                    - /url: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
                  - 'link "Jump to the full reference for Palletizing Robot Cost & ROI 2026: Price & Payback Guide" [ref=e246] [cursor=pointer]':
                    - /url: "#ref-evst-cell-cost-2026"
                    - generic [ref=e247]: ↓
                - text: .
              - text: The calculator's 2.5 multiple and 24-month threshold are selections within that context, not quoted measurements.
            - heading "What is actually automated at scale" [level=2] [ref=e248]:
              - link "What is actually automated at scale" [ref=e249] [cursor=pointer]:
                - /url: "#what-is-actually-automated-at-scale"
              - button "Copy link to this section, What is actually automated at scale" [ref=e251] [cursor=pointer]
            - paragraph [ref=e254]:
              - text: "Strip the installed base down by task and one honest sentence covers most of it: repetitive motion in a fixed cell, with little or no perception worth the name. OSHA’s Technical Manual lists uses of industrial robot systems including arc and resistance welding, painting and spraying, machine-tool loading and unloading, assembly, materials handling and packaging"
              - generic [ref=e257]:
                - link "Administration 2026" [ref=e258] [cursor=pointer]:
                  - /url: https://www.osha.gov/otm/section-4-safety-hazards/chapter-4
                - 'link "Jump to the full reference for OSHA Technical Manual, Section IV: Chapter 4, Industrial Robot Systems and Industrial Robot System Safety" [ref=e259] [cursor=pointer]':
                  - /url: "#ref-osha-otm-robots"
                  - generic [ref=e260]: ↓
              - text: ". A spot-welding cell in a body shop repeats one trajectory against one fixture thousands of times a shift; the \"perception\" is the fixture guaranteeing the part is exactly where the program expects it. In A3's North American order data for 2025, collaborative robots accounted for 7,212 units valued at $241 million: 19.6 percent of the 36,766 robots ordered and 10.7 percent of the $2.25 billion in order value. A3 began reporting collaborative robots as a distinct category in Q1 2025"
              - generic [ref=e261]:
                - generic [ref=e263]:
                  - link "Automation 2026" [ref=e264] [cursor=pointer]:
                    - /url: https://www.automate.org/robotics/news/robot-orders-grow-6-6-in-2025-as-general-industries-drive-broader-automation-adoption
                  - link "Jump to the full reference for Robot Orders Grow 6.6% in 2025 as General Industries Drive Broader Automation Adoption" [ref=e265] [cursor=pointer]:
                    - /url: "#ref-a3-orders-2025"
                    - generic [ref=e266]: ↓
                - text: .
            - paragraph [ref=e267]:
              - text: The genuinely learned frontier inside this base is logistics, and it is worth naming its subsystems because they are the machines a manipulation policy actually competes with.
              - link "Automated storage and retrieval" [ref=e269] [cursor=pointer]:
                - /url: /glossary/#automated-storage-and-retrieval
              - text: puts high-bay racking and shuttles where aisles and forklifts used to be.
              - link "Autonomous mobile robot" [ref=e271] [cursor=pointer]:
                - /url: /glossary/#autonomous-mobile-robot
              - text: fleets move cases and totes under a traffic manager.
              - link "Goods-to-person" [ref=e273] [cursor=pointer]:
                - /url: /glossary/#goods-to-person
              - text: stations bring the shelf to a stationary human, which is the arrangement that sets the productivity bar any automated picker must beat, and piece picking from mixed bins is the task at that bar's edge. In its October 18, 2023 Sequoia and Digit announcement, Amazon reported over 750,000 robots working collaboratively with employees. Sequoia was operating at one Houston fulfillment center; testing Digit for tote recycling was planned
              - generic [ref=e276]:
                - link "Dresser 2023" [ref=e277] [cursor=pointer]:
                  - /url: https://www.aboutamazon.com/news/operations/amazon-introduces-new-robotics-solutions
                - link "Jump to the full reference for Amazon announces 2 new ways it's using robots to assist employees and deliver for customers" [ref=e278] [cursor=pointer]:
                  - /url: "#ref-amazon-sequoia-digit-2023"
                  - generic [ref=e279]: ↓
              - text: . The company’s fleet overview, published October 9, 2024 and updated June 4, 2026, reports more than one million robots deployed across its operations network since 2012. It describes Sequoia inventory handling, Sparrow piece picking, Vulcan picking and stowing, and Proteus cart transport, while separately describing next-generation Proteus as a lab pilot awaiting deployment
              - generic [ref=e282]:
                - link "Greenawalt 2024" [ref=e283] [cursor=pointer]:
                  - /url: https://www.aboutamazon.com/news/operations/amazon-robotics-robots-fulfillment-center
                - 'link "Jump to the full reference for Amazon robotics: Meet the robots inside fulfillment centers" [ref=e284] [cursor=pointer]':
                  - /url: "#ref-amazon-robot-fleet-2026"
                  - generic [ref=e285]: ↓
              - text: . In the 2023 announcement, Amazon said Sequoia could identify and store received inventory up to 75 percent faster than its then-current process, and reduce the time to process an order through a fulfillment center by up to 25 percent
              - generic [ref=e286]:
                - generic [ref=e288]:
                  - link "Dresser 2023" [ref=e289] [cursor=pointer]:
                    - /url: https://www.aboutamazon.com/news/operations/amazon-introduces-new-robotics-solutions
                  - link "Jump to the full reference for Amazon announces 2 new ways it's using robots to assist employees and deliver for customers" [ref=e290] [cursor=pointer]:
                    - /url: "#ref-amazon-sequoia-digit-2023"
                    - generic [ref=e291]: ↓
                - text: .
              - text: Amazon’s Vulcan article, published May 7, 2025 and updated June 4, 2026, describes force-feedback picking and stowing of approximately 75 percent of the types of items stored at its fulfillment centers, at speeds comparable to front-line employees. It describes high and low inventory-pod work at Spokane and Hamburg, handoff to employees for items the system cannot move, and further European and US deployment as planned. The coverage figure describes item types, not pick success or independently validated reliability
              - generic [ref=e292]:
                - generic [ref=e294]:
                  - link "Davies 2025" [ref=e295] [cursor=pointer]:
                    - /url: https://www.aboutamazon.com/news/operations/amazon-vulcan-robot-pick-stow-touch
                  - 'link "Jump to the full reference for Introducing Vulcan: Amazon''s first robot with a sense of touch" [ref=e296] [cursor=pointer]':
                    - /url: "#ref-amazon-vulcan-2026"
                    - generic [ref=e297]: ↓
                - text: .
              - text: These are company-reported figures for different tasks and reporting scopes. The cumulative deployment total is not a simultaneous active-fleet count.
            - paragraph [ref=e298]:
              - text: Symbotic's FY2025 Form 10-K distinguishes contracted work from revenue. It reports approximately $22.5 billion of backlog as of September 27, 2025 and $2.246922 billion of total revenue for the fiscal year ended that day. Backlog means unperformed obligations under existing contracts, not revenue already earned. The filing says the Walmart agreement, expanded in May 2022, covers implementation across all 42 regional distribution centres; that is contractual scope, not a count of operating sites
              - generic [ref=e301]:
                - link "Inc. 2025" [ref=e302] [cursor=pointer]:
                  - /url: https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm
                - link "Jump to the full reference for Symbotic Inc. Form 10-K, fiscal year ended September 27, 2025" [ref=e303] [cursor=pointer]:
                  - /url: "#ref-symbotic-10k-2025"
                  - generic [ref=e304]: ↓
              - text: . For the year ended September 27, 2025, Symbotic reports 50 systems in deployment and 48 operational systems under software maintenance and support contracts. It then expected approximately 12 percent of backlog to be recognized as revenue in fiscal 2026. That is a revenue-recognition forecast, not an order-to-running duration; remaining performance obligation estimates can change with terminations, contract scope and other adjustments
              - generic [ref=e305]:
                - generic [ref=e307]:
                  - link "Inc. 2025" [ref=e308] [cursor=pointer]:
                    - /url: https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm
                  - link "Jump to the full reference for Symbotic Inc. Form 10-K, fiscal year ended September 27, 2025" [ref=e309] [cursor=pointer]:
                    - /url: "#ref-symbotic-10k-2025"
                    - generic [ref=e310]: ↓
                - text: .
              - text: "The unwind reads the same way: Kroger closed three of the eight automated sheds it built with Ocado, said it was monitoring the remaining five, and pays Ocado around £190 million in compensation for the privilege"
              - generic [ref=e311]:
                - generic [ref=e313]:
                  - link "Hawkins 2025" [ref=e314] [cursor=pointer]:
                    - /url: https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html
                  - 'link "Jump to the full reference for Warehouse closures crush Ocado shares: US partner shuts three sites in ''a devastating blow'' to UK firm" [ref=e315] [cursor=pointer]':
                    - /url: "#ref-kroger-ocado-closures-2025"
                    - generic [ref=e316]: ↓
                - text: .
              - text: Scale can go both ways. Ocado's own automation division, Ocado Intelligent Automation, sells the same grid-robot warehouses outward from grocery into healthcare, third-party logistics and industrial parts
              - generic [ref=e317]:
                - generic [ref=e319]:
                  - link "Group 2026" [ref=e320] [cursor=pointer]:
                    - /url: https://ocadointelligentautomation.com/
                  - link "Jump to the full reference for Ocado Intelligent Automation" [ref=e321] [cursor=pointer]:
                    - /url: "#ref-ocado-oia-2026"
                    - generic [ref=e322]: ↓
                - text: .
            - heading "The integrator's multiple" [level=2] [ref=e323]:
              - link "The integrator's multiple" [ref=e324] [cursor=pointer]:
                - /url: "#the-integrators-multiple"
              - button "Copy link to this section, The integrator's multiple" [ref=e326] [cursor=pointer]
            - paragraph [ref=e329]:
              - text: A robot arm is a minority of what a robot cell costs. Integrator guidance for palletising cells quotes complete systems at two to three times the arm's price, with the robot body itself a third to half of total cell cost
              - generic [ref=e330]:
                - generic [ref=e332]:
                  - link "EVST Engineering Team 2026" [ref=e333] [cursor=pointer]:
                    - /url: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
                  - 'link "Jump to the full reference for Palletizing Robot Cost & ROI 2026: Price & Payback Guide" [ref=e334] [cursor=pointer]':
                    - /url: "#ref-evst-cell-cost-2026"
                    - generic [ref=e335]: ↓
                - text: .
            - paragraph [ref=e336]:
              - text: EVST's July 15, 2026 commercial palletising-cell guide lists application-specific end-of-arm tooling; perimeter fencing, light curtains or area scanners, interlocked gates and safety-rated PLCs; mechanical and electrical installation, PLC/HMI integration with upstream conveyors or wrapping equipment, and on-site commissioning and testing; plus pattern programming, software licences and any vision-guided pick logic for mixed loads. The surrounding-line work depends on what is already installed
              - generic [ref=e337]:
                - generic [ref=e339]:
                  - link "EVST Engineering Team 2026" [ref=e340] [cursor=pointer]:
                    - /url: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
                  - 'link "Jump to the full reference for Palletizing Robot Cost & ROI 2026: Price & Payback Guide" [ref=e341] [cursor=pointer]':
                    - /url: "#ref-evst-cell-cost-2026"
                    - generic [ref=e342]: ↓
                - text: .
            - paragraph [ref=e343]:
              - text: OSHA's Technical Manual, discussing ANSI/RIA R15.06-2012, says the
              - link "systems integrator" [ref=e345] [cursor=pointer]:
                - /url: /glossary/#systems-integrator
              - text: is responsible for completing and documenting the robot application's risk assessment before commissioning and providing the results to the employer. Manufacturers or employers may also act as integrators. The employer retains responsibility for a safe workplace, and having a risk assessment alone does not establish that the application protects workers
              - generic [ref=e346]:
                - generic [ref=e348]:
                  - link "Administration 2026" [ref=e349] [cursor=pointer]:
                    - /url: https://www.osha.gov/otm/section-4-safety-hazards/chapter-4
                  - 'link "Jump to the full reference for OSHA Technical Manual, Section IV: Chapter 4, Industrial Robot Systems and Industrial Robot System Safety" [ref=e350] [cursor=pointer]':
                    - /url: "#ref-osha-otm-robots"
                    - generic [ref=e351]: ↓
                - text: .
            - paragraph [ref=e352]:
              - text: "The practical consequence for a policy: buy a robot and deploy a policy is wrong by an order of magnitude as a model of what shipping costs, and the buyer who signs the cheque is buying a line that must hit a rate, not a demo that must impress once. In its April 16, 2026 investor outlook, Bessemer predicts that near-term value will accrue to full-stack, vertically integrated players rather than pure-play foundation-model companies. The authors say deployment requires domain-specific data collection, target-environment fine-tuning, hardware integration and operational infrastructure. They also stress expensive data collection and foundation models that are not yet general enough to work out of the box"
              - generic [ref=e355]:
                - link "Levine 2026" [ref=e356] [cursor=pointer]:
                  - /url: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai
                - 'link "Jump to the full reference for Bessemer Predicts: Robotics and physical AI" [ref=e357] [cursor=pointer]':
                  - /url: "#ref-bessemer-robotics-2026"
                  - generic [ref=e358]: ↓
              - text: .
            - heading "The metrics that decide a deployment" [level=2] [ref=e359]:
              - link "The metrics that decide a deployment" [ref=e360] [cursor=pointer]:
                - /url: "#the-metrics-that-decide-a-deployment"
              - button "Copy link to this section, The metrics that decide a deployment" [ref=e362] [cursor=pointer]
            - paragraph [ref=e365]:
              - text: Five quantities decide whether a cell ships, and none of them is a benchmark score.
              - link "Cycle time" [ref=e367] [cursor=pointer]:
                - /url: /glossary/#cycle-time
              - text: is the elapsed time of one complete repetition of the task, start of one pick to start of the next, and it is the denominator of throughput.
              - link "Takt time" [ref=e369] [cursor=pointer]:
                - /url: /glossary/#takt-time
              - text: ", from Ohno's Toyota Production System, is the demand rate the line must match, available time divided by required units; a cell slower than takt starves the line no matter how elegant its policy"
              - generic [ref=e370]:
                - generic [ref=e372]:
                  - link "Ohno 1988" [ref=e373] [cursor=pointer]:
                    - /url: https://www.taylorfrancis.com/books/mono/10.4324/9780429273018/toyota-production-system-taiichi-ohno
                  - 'link "Jump to the full reference for Toyota Production System: Beyond Large-Scale Production" [ref=e374] [cursor=pointer]':
                    - /url: "#ref-ohno-tps-1988"
                    - generic [ref=e375]: ↓
                - text: .
              - text: NASA distinguishes inherent availability, which uses
              - link "mean time between failures" [ref=e377] [cursor=pointer]:
                - /url: /glossary/#mean-time-between-failures
              - text: and mean time to repair, from operational availability. The inherent measure excludes administrative and logistics delays and preventive maintenance; the operational measure includes corrective and preventive maintenance, administrative delays and logistics support time. Here, uptime means time in an operable state, not necessarily time spent producing
              - generic [ref=e378]:
                - generic [ref=e380]:
                  - link "NASA 1994" [ref=e381] [cursor=pointer]:
                    - /url: https://llis.nasa.gov/lesson/841
                  - link "Jump to the full reference for Availability Prediction and Analysis" [ref=e382] [cursor=pointer]:
                    - /url: "#ref-nasa-availability-prediction-analysis"
                    - generic [ref=e383]: ↓
                - text: .
              - text: "The calculator above reports capital cost per modeled pick: robot price times the integration multiple, divided by its modeled lifetime pick count over a fixed amortization period. It does not include running costs. This is a local worked-example calculation, not a measured deployment result."
            - paragraph [ref=e384]:
              - text: The
              - link "payback period" [ref=e386] [cursor=pointer]:
                - /url: /glossary/#payback-period
              - text: is total system capital cost divided by monthly labour, reduced-damage and throughput value. EVST's guide estimates 12 to 24 months for multi-shift palletising cells and says single-shift or lower-throughput operations typically stretch closer to 24 to 36 months
              - generic [ref=e387]:
                - generic [ref=e389]:
                  - link "EVST Engineering Team 2026" [ref=e390] [cursor=pointer]:
                    - /url: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
                  - 'link "Jump to the full reference for Palletizing Robot Cost & ROI 2026: Price & Payback Guide" [ref=e391] [cursor=pointer]':
                    - /url: "#ref-evst-cell-cost-2026"
                    - generic [ref=e392]: ↓
                - text: .
            - heading "The jam rate is the lesson" [level=2] [ref=e393]:
              - link "The jam rate is the lesson" [ref=e394] [cursor=pointer]:
                - /url: "#the-jam-rate-is-the-lesson"
              - button "Copy link to this section, The jam rate is the lesson" [ref=e396] [cursor=pointer]
            - paragraph [ref=e399]:
              - text: The calculator exists for one argument. A picker that succeeds on 99 percent of picks fails on one pick in a hundred, and every failure needs a human to clear it. If clearing takes ten seconds, the failures cost a tenth of a second per pick of extra labour, and the cell is comfortably economic at a success rate a paper would call unusable. If clearing takes ten minutes, because the jam wedges a tote, drops an item into the track, or faults the fleet manager, the same 99 percent is ruinous. Ken Goldberg proposes combining model-based engineering with model-free learning so robots can perform useful work, collect real-world data, and use those data to improve performance and learn adjacent skills. This is a proposed way to bootstrap data collection, not a claim that engineering removes the need for learning. He also expects model-free AI eventually to enable fully general-purpose robots
              - generic [ref=e400]:
                - generic [ref=e402]:
                  - link "Goldberg 2025" [ref=e403] [cursor=pointer]:
                    - /url: https://doi.org/10.1126/scirobotics.aea7390
                  - link "Jump to the full reference for Good old-fashioned engineering can close the 100,000-year \"data gap\" in robotics" [ref=e404] [cursor=pointer]:
                    - /url: "#ref-goldberg-data-gap-2025"
                    - generic [ref=e405]: ↓
                - text: .
              - text: The demo-to-production gap this site tracks at
              - link "The Reliability Gap" [ref=e406] [cursor=pointer]:
                - /url: /frontier/reliability-gap
              - text: "is reframed by this: what looks like an arithmetic problem in per-step success is very often an operations-design problem in intervention cost, and it is why the"
              - link "intervention rate" [ref=e408] [cursor=pointer]:
                - /url: /glossary/#intervention-rate
              - text: and the cost of clearing each intervention, not the success rate alone, decide whether a cell ships. Morgan Stanley's 2026 note on the humanoid industry's "PR problem" is the same observation about the hype cycle from the capital side
              - generic [ref=e409]:
                - generic [ref=e411]:
                  - link "Wilkins 2026" [ref=e412] [cursor=pointer]:
                    - /url: https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html
                  - link "Jump to the full reference for 'PR problem' is standing in the way of China's humanoid robot boom, says Morgan Stanley" [ref=e413] [cursor=pointer]:
                    - /url: "#ref-morgan-stanley-pr-problem-2026"
                    - generic [ref=e414]: ↓
                - text: ","
              - text: and Figure's eight-hour autonomous sorting shift, impressive as it is, was one task at one site, on the company's own livestream, with no published success rate
              - generic [ref=e415]:
                - generic [ref=e417]:
                  - link "Belmonte 2026" [ref=e418] [cursor=pointer]:
                    - /url: https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots
                  - link "Jump to the full reference for Figure AI's Helix-02 Robots Complete Full 8-Hour Autonomous Shifts as Humanoid Race Intensifies" [ref=e419] [cursor=pointer]:
                    - /url: "#ref-figure-8hr-shift-2026"
                    - generic [ref=e420]: ↓
                - text: .
              - text: The six-row deployment dashboard at
              - link "The Reliability Gap" [ref=e421] [cursor=pointer]:
                - /url: /frontier/reliability-gap
              - text: tracks exactly those pilots; this page deliberately does not repeat it.
            - heading "Brownfield versus greenfield" [level=2] [ref=e422]:
              - link "Brownfield versus greenfield" [ref=e423] [cursor=pointer]:
                - /url: "#brownfield-versus-greenfield"
              - button "Copy link to this section, Brownfield versus greenfield" [ref=e425] [cursor=pointer]
            - paragraph [ref=e428]:
              - text: "The same technology succeeds or fails on where it is installed. A greenfield site is designed around the automation: floor loading, ceiling height, power, network, and traffic lanes exist because the system needed them. A"
              - link "brownfield deployment" [ref=e430] [cursor=pointer]:
                - /url: /glossary/#brownfield-deployment
              - text: "must fit the automation into a building that already runs. OSHA's Technical Manual describes safeguards for non-collaborative robot applications during automatic operation: guards such as fences and barriers, interlocked guards, and presence-sensing devices. It also describes reduced-speed manual mode with an enabling device for workers teaching inside the safeguarded space, plus lockout/tagout procedures and training. Its maintenance guidance calls for control of hazardous energy under 29 CFR 1910.147 or 29 CFR 1910.333"
              - generic [ref=e431]:
                - generic [ref=e433]:
                  - link "Administration 2026" [ref=e434] [cursor=pointer]:
                    - /url: https://www.osha.gov/otm/section-4-safety-hazards/chapter-4
                  - 'link "Jump to the full reference for OSHA Technical Manual, Section IV: Chapter 4, Industrial Robot Systems and Industrial Robot System Safety" [ref=e435] [cursor=pointer]':
                    - /url: "#ref-osha-otm-robots"
                    - generic [ref=e436]: ↓
                - text: .
              - text: Separately, Symbotic, describing its own systems in its FY2025 Form 10-K, says it can install them in phases while the existing warehouse continues to operate; this is a company-reported capability, not a guarantee for every retrofit
              - generic [ref=e437]:
                - generic [ref=e439]:
                  - link "Inc. 2025" [ref=e440] [cursor=pointer]:
                    - /url: https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm
                  - link "Jump to the full reference for Symbotic Inc. Form 10-K, fiscal year ended September 27, 2025" [ref=e441] [cursor=pointer]:
                    - /url: "#ref-symbotic-10k-2025"
                    - generic [ref=e442]: ↓
                - text: .
              - text: The safety-and-assurance obligations of deployment have their own page at
              - link "Safety and Assurance" [ref=e443] [cursor=pointer]:
                - /url: /frontier/safety-and-assurance
              - text: .
            - heading "The labour evidence, disagreement intact" [level=2] [ref=e444]:
              - link "The labour evidence, disagreement intact" [ref=e445] [cursor=pointer]:
                - /url: "#the-labour-evidence-disagreement-intact"
              - button "Copy link to this section, The labour evidence, disagreement intact" [ref=e447] [cursor=pointer]
            - paragraph [ref=e450]:
              - text: What robots do to jobs is a live empirical fight, and this page takes no side. Daron Acemoglu and Pascual Restrepo, in the Journal of Political Economy, find that one additional robot per thousand workers reduces the US employment-to-population ratio by about 0.2 percentage points and wages by 0.42 percent, with the losses concentrated in commuting zones exposed to industrial automation
              - generic [ref=e451]:
                - generic [ref=e453]:
                  - link "Acemoglu 2020" [ref=e454] [cursor=pointer]:
                    - /url: https://doi.org/10.1086/705716
                  - 'link "Jump to the full reference for Robots and Jobs: Evidence from US Labor Markets" [ref=e455] [cursor=pointer]':
                    - /url: "#ref-acemoglu-restrepo-2020"
                    - generic [ref=e456]: ↓
                - text: .
              - text: The MIT Task Force on the Work of the Future, co-chaired by David Autor and David Mindell with Elisabeth Reynolds as executive director, reported in 2020 that it found no compelling evidence of technological advances driving a jobless future. It describes automation displacing human labour from some tasks while creating new work, with the jobs available and the skills they demand shaped by economic incentives, policy choices and institutional forces
              - generic [ref=e457]:
                - generic [ref=e459]:
                  - link "Autor 2020" [ref=e460] [cursor=pointer]:
                    - /url: https://ipc.mit.edu/research/work-of-the-future/
                  - 'link "Jump to the full reference for The Work of the Future: Building Better Jobs in an Age of Intelligent Machines" [ref=e461] [cursor=pointer]':
                    - /url: "#ref-mit-work-future-2020"
                    - generic [ref=e462]: ↓
                - text: .
              - text: "Both positions are named and both are serious; the field has not converged. What neither side disputes is the scale mismatch in the current cycle: the industrial installed base grew over decades, and the humanoid fleet being pitched as the next one is, so far, a rounding error against it, with even the volume leader's revenue growth decelerating from 332 to 68 percent and its Q1 2026 adjusted net profit down 52.55 percent year on year"
              - generic [ref=e463]:
                - generic [ref=e465]:
                  - link "Ramsey 2026" [ref=e466] [cursor=pointer]:
                    - /url: https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm
                  - 'link "Jump to the full reference for Robot Boom Meets Earnings Reality: Unitree Profits Halved, Optimus Not for Sale" [ref=e467] [cursor=pointer]':
                    - /url: "#ref-unitree-profit-2026"
                    - generic [ref=e468]: ↓
                - text: .
            - paragraph [ref=e469]:
              - text: "The boundary with the rest of this site is deliberate. This page is the operating field: the installed base, the integrator's invoice, and the arithmetic of keeping a cell running."
              - link "The Reliability Gap" [ref=e470] [cursor=pointer]:
                - /url: /frontier/reliability-gap
              - text: is where the demo-to-production argument lives, and the
              - link "market map" [ref=e471] [cursor=pointer]:
                - /url: /market-map
              - text: is the capital cycle that finances all of it.
          - separator
          - region [ref=e472]:
            - heading "See also" [level=2] [ref=e473]
            - list [ref=e474]:
              - listitem [ref=e475]:
                - link "Hardware Taxonomy" [ref=e476] [cursor=pointer]:
                  - /url: /data-hardware/hardware-taxonomy/
                - paragraph [ref=e477]: "Arms, humanoids, hands, sensors, and compute: a buyer's guide from SO-101 to Jetson Thor."
              - listitem [ref=e478]:
                - link "Teleoperation Rigs" [ref=e479] [cursor=pointer]:
                  - /url: /data-hardware/teleop-rigs/
                - paragraph [ref=e480]: "ALOHA, GELLO, UMI, and VR teleop: cost, data quality, throughput, and the embodiment gap."
              - listitem [ref=e481]:
                - link "The Data Bottleneck" [ref=e482] [cursor=pointer]:
                  - /url: /data-hardware/data-bottleneck/
                - paragraph [ref=e483]: "Robot-hours versus LLM tokens: the log-log reality of embodied data and teleop-farm economics."
          - region [ref=e484]:
            - heading "Linked from" [level=2] [ref=e485]
            - list [ref=e486]:
              - listitem [ref=e487]:
                - link "Hardware Taxonomy" [ref=e488] [cursor=pointer]:
                  - /url: /data-hardware/hardware-taxonomy/
                - paragraph [ref=e489]: "Arms, humanoids, hands, sensors, and compute: a buyer's guide from SO-101 to Jetson Thor."
              - listitem [ref=e490]:
                - link "The Bear Case" [ref=e491] [cursor=pointer]:
                  - /url: /frontier/bear-case/
                - paragraph [ref=e492]: Why this could be another robotics winter, and the milestones that would prove it wrong.
          - region [ref=e493]:
            - heading "References" [level=2] [ref=e494]
            - list [ref=e495]:
              - listitem [ref=e496]:
                - generic [ref=e497]: "1"
                - generic [ref=e498]:
                  - link "World Robotics 2025 – Industrial Robots" [ref=e500] [cursor=pointer]:
                    - /url: https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf
                  - paragraph [ref=e501]: Christopher Müller, IFR Statistical Department, VDMA Services GmbH, Frankfurt am Main, Germany, 2025.
                  - paragraph [ref=e502]: https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf
              - listitem [ref=e503]:
                - generic [ref=e504]: "2"
                - generic [ref=e505]:
                  - link "China Makes AI-powered Robots Core of National Strategy" [ref=e507] [cursor=pointer]:
                    - /url: https://ifr.org/ifr-press-releases/news/china-makes-ai-powered-robots-core-of-national-strategy
                  - paragraph [ref=e508]: International Federation of Robotics, IFR press release, 2026-05-05.
                  - paragraph [ref=e509]: https://ifr.org/ifr-press-releases/news/china-makes-ai-powered-robots-core-of-national-strategy
              - listitem [ref=e510]:
                - generic [ref=e511]: "3"
                - generic [ref=e512]:
                  - link "Robot Orders Grow 6.6% in 2025 as General Industries Drive Broader Automation Adoption" [ref=e514] [cursor=pointer]:
                    - /url: https://www.automate.org/robotics/news/robot-orders-grow-6-6-in-2025-as-general-industries-drive-broader-automation-adoption
                  - paragraph [ref=e515]: Association for Advancing Automation, A3, 2026-02-06.
                  - paragraph [ref=e516]: https://www.automate.org/robotics/news/robot-orders-grow-6-6-in-2025-as-general-industries-drive-broader-automation-adoption
              - listitem [ref=e517]:
                - generic [ref=e518]: "4"
                - generic [ref=e519]:
                  - link "Symbotic Inc. Form 10-K, fiscal year ended September 27, 2025" [ref=e521] [cursor=pointer]:
                    - /url: https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm
                  - paragraph [ref=e522]: Symbotic Inc., U.S. Securities and Exchange Commission, 2025.
                  - paragraph [ref=e523]: https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm
              - listitem [ref=e524]:
                - generic [ref=e525]: "5"
                - generic [ref=e526]:
                  - link "Amazon announces 2 new ways it's using robots to assist employees and deliver for customers" [ref=e528] [cursor=pointer]:
                    - /url: https://www.aboutamazon.com/news/operations/amazon-introduces-new-robotics-solutions
                  - paragraph [ref=e529]: Scott Dresser, Amazon company press, published 2023-10-18.
                  - paragraph [ref=e530]: https://www.aboutamazon.com/news/operations/amazon-introduces-new-robotics-solutions
              - listitem [ref=e531]:
                - generic [ref=e532]: "6"
                - generic [ref=e533]:
                  - 'link "Amazon robotics: Meet the robots inside fulfillment centers" [ref=e535] [cursor=pointer]':
                    - /url: https://www.aboutamazon.com/news/operations/amazon-robotics-robots-fulfillment-center
                  - paragraph [ref=e536]: Tyler Greenawalt, Amazon company press, published 2024-10-09; updated 2026-06-04.
                  - paragraph [ref=e537]: https://www.aboutamazon.com/news/operations/amazon-robotics-robots-fulfillment-center
              - listitem [ref=e538]:
                - generic [ref=e539]: "7"
                - generic [ref=e540]:
                  - 'link "Introducing Vulcan: Amazon''s first robot with a sense of touch" [ref=e542] [cursor=pointer]':
                    - /url: https://www.aboutamazon.com/news/operations/amazon-vulcan-robot-pick-stow-touch
                  - paragraph [ref=e543]: Alex Davies, Amazon company press, published 2025-05-07; updated 2026-06-04.
                  - paragraph [ref=e544]: https://www.aboutamazon.com/news/operations/amazon-vulcan-robot-pick-stow-touch
              - listitem [ref=e545]:
                - generic [ref=e546]: "8"
                - generic [ref=e547]:
                  - 'link "Robots and Jobs: Evidence from US Labor Markets" [ref=e549] [cursor=pointer]':
                    - /url: https://doi.org/10.1086/705716
                  - paragraph [ref=e550]: Daron Acemoglu, Pascual Restrepo, Journal of Political Economy 128(6), 2188-2244, 2020.
                  - paragraph [ref=e551]: https://doi.org/10.1086/705716
              - listitem [ref=e552]:
                - generic [ref=e553]: "9"
                - generic [ref=e554]:
                  - 'link "The Work of the Future: Building Better Jobs in an Age of Intelligent Machines" [ref=e556] [cursor=pointer]':
                    - /url: https://ipc.mit.edu/research/work-of-the-future/
                  - paragraph [ref=e557]: David Autor, David Mindell, Elisabeth Reynolds, MIT Task Force on the Work of the Future, MIT, final report of the Task Force, 2020.
                  - paragraph [ref=e558]: https://ipc.mit.edu/research/work-of-the-future/
              - listitem [ref=e559]:
                - generic [ref=e560]: "10"
                - generic [ref=e561]:
                  - 'link "Toyota Production System: Beyond Large-Scale Production" [ref=e563] [cursor=pointer]':
                    - /url: https://www.taylorfrancis.com/books/mono/10.4324/9780429273018/toyota-production-system-taiichi-ohno
                  - paragraph [ref=e564]: Taiichi Ohno, Productivity Press (reissued by Routledge), 1988.
                  - paragraph [ref=e565]: https://www.taylorfrancis.com/books/mono/10.4324/9780429273018/toyota-production-system-taiichi-ohno
              - listitem [ref=e566]:
                - generic [ref=e567]: "11"
                - generic [ref=e568]:
                  - link "Availability Prediction and Analysis" [ref=e570] [cursor=pointer]:
                    - /url: https://llis.nasa.gov/lesson/841
                  - paragraph [ref=e571]: "NASA, NASA Lessons Learned Information System, Lesson 841, 1994-12-01; submitting organization: jsc."
                  - paragraph [ref=e572]: https://llis.nasa.gov/lesson/841
              - listitem [ref=e573]:
                - generic [ref=e574]: "12"
                - generic [ref=e575]:
                  - 'link "Palletizing Robot Cost & ROI 2026: Price & Payback Guide" [ref=e577] [cursor=pointer]':
                    - /url: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
                  - paragraph [ref=e578]: EVST Engineering Team, EVST (EVS TECH CO., LTD), 2026-07-15.
                  - paragraph [ref=e579]: https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/
              - listitem [ref=e580]:
                - generic [ref=e581]: "13"
                - generic [ref=e582]:
                  - 'link "Warehouse closures crush Ocado shares: US partner shuts three sites in ''a devastating blow'' to UK firm" [ref=e584] [cursor=pointer]':
                    - /url: https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html
                  - paragraph [ref=e585]: Emily Hawkins, This is Money, 2025-11-18.
                  - paragraph [ref=e586]: https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html
              - listitem [ref=e587]:
                - generic [ref=e588]: "14"
                - generic [ref=e589]:
                  - 'link "OSHA Technical Manual, Section IV: Chapter 4, Industrial Robot Systems and Industrial Robot System Safety" [ref=e591] [cursor=pointer]':
                    - /url: https://www.osha.gov/otm/section-4-safety-hazards/chapter-4
                  - paragraph [ref=e592]: Occupational Safety and Health Administration, U.S. Department of Labor, as of 2026-08-22.
                  - paragraph [ref=e593]: https://www.osha.gov/otm/section-4-safety-hazards/chapter-4
              - listitem [ref=e594]:
                - generic [ref=e595]: "15"
                - generic [ref=e596]:
                  - link "Ocado Intelligent Automation" [ref=e598] [cursor=pointer]:
                    - /url: https://ocadointelligentautomation.com/
                  - paragraph [ref=e599]: Ocado Group, Ocado Group, as of 2026-08-22.
                  - paragraph [ref=e600]: https://ocadointelligentautomation.com/
              - listitem [ref=e601]:
                - generic [ref=e602]: "16"
                - generic [ref=e603]:
                  - 'link "Humanoid Robots in 2026: What Is Actually Deployed" [ref=e605] [cursor=pointer]':
                    - /url: https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/
                  - paragraph [ref=e606]: Alius Noreika, 2026.
                  - paragraph [ref=e607]: https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/
              - listitem [ref=e608]:
                - generic [ref=e609]: "17"
                - generic [ref=e610]:
                  - link "38 Best Humanoid Robots in 2026" [ref=e612] [cursor=pointer]:
                    - /url: https://blog.robozaps.com/b/best-humanoid-robots
                  - paragraph [ref=e613]: RoboZaps, 2026.
                  - paragraph [ref=e614]: https://blog.robozaps.com/b/best-humanoid-robots
              - listitem [ref=e615]:
                - generic [ref=e616]: "18"
                - generic [ref=e617]:
                  - 'link "Robot Boom Meets Earnings Reality: Unitree Profits Halved, Optimus Not for Sale" [ref=e619] [cursor=pointer]':
                    - /url: https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm
                  - paragraph [ref=e620]: Mireya Ramsey, TechTimes, 2026.
                  - paragraph [ref=e621]: https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm
              - listitem [ref=e622]:
                - generic [ref=e623]: "19"
                - generic [ref=e624]:
                  - link "'PR problem' is standing in the way of China's humanoid robot boom, says Morgan Stanley" [ref=e626] [cursor=pointer]:
                    - /url: https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html
                  - paragraph [ref=e627]: Joseph Wilkins, CNBC, 2026.
                  - paragraph [ref=e628]: https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html
              - listitem [ref=e629]:
                - generic [ref=e630]: "20"
                - generic [ref=e631]:
                  - link "Figure AI's Helix-02 Robots Complete Full 8-Hour Autonomous Shifts as Humanoid Race Intensifies" [ref=e633] [cursor=pointer]:
                    - /url: https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots
                  - paragraph [ref=e634]: Kyle Belmonte, 2026.
                  - paragraph [ref=e635]: https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots
              - listitem [ref=e636]:
                - generic [ref=e637]: "21"
                - generic [ref=e638]:
                  - link "Good old-fashioned engineering can close the 100,000-year \"data gap\" in robotics" [ref=e640] [cursor=pointer]:
                    - /url: https://doi.org/10.1126/scirobotics.aea7390
                  - paragraph [ref=e641]: Ken Goldberg, Science Robotics, 2025.
                  - paragraph [ref=e642]: https://doi.org/10.1126/scirobotics.aea7390
              - listitem [ref=e643]:
                - generic [ref=e644]: "22"
                - generic [ref=e645]:
                  - 'link "Bessemer Predicts: Robotics and physical AI" [ref=e647] [cursor=pointer]':
                    - /url: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai
                  - paragraph [ref=e648]: Jeremy Levine, Talia Goldberg, Janelle Teng Wade, Alexandra Sukin, Bhavik Nagda, Jason Scheller, Christine Deakers, 2026.
                  - paragraph [ref=e649]: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai
      - contentinfo [ref=e650]:
        - generic [ref=e651]:
          - link "Robot Wiki" [ref=e653] [cursor=pointer]:
            - /url: /
          - paragraph [ref=e654]:
            - text: Written and maintained by
            - link "Josef Chen" [ref=e655] [cursor=pointer]:
              - /url: https://github.com/josefchen
            - text: .
            - link "Source on GitHub" [ref=e656] [cursor=pointer]:
              - /url: https://github.com/josefchen/robot-wiki
            - text: .
  - alert [ref=e657]
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import { writeFileSync } from 'node:fs';
  4  | import { DIRECTORY, ROUTE, BROWSER, artifact, dependencies, defaults, ranges, oracle, save } from '../../audit/evidence/economics-local-20260923/support';
  5  | import { setSlider } from './slider';
  6  | 
  7  | const producing = process.env.ECONOMICS_WRITE_BROWSER === '1';
  8  | async function capture(page: Page, name: string) {
  9  |   const viewport = page.viewportSize()!;
  10 |   if (!producing) return { viewport, dom: null, capture: null };
  11 |   const domPath = `${DIRECTORY}/captures/${name}.dom.json`;
  12 |   const pngPath = `${DIRECTORY}/captures/${name}.png`;
  13 |   const dom = await page.evaluate(() => ({ text: document.body.innerText, html: document.querySelector('#main-content')!.outerHTML }));
  14 |   writeFileSync(domPath, JSON.stringify(dom, null, 2) + '\n', { flag: 'wx' });
  15 |   await page.screenshot({ path: pngPath, animations: 'disabled' });
  16 |   return { viewport, dom: artifact(domPath), capture: artifact(pngPath) };
  17 | }
  18 | 
  19 | test('industrial52 actual default robot-cost endpoints and reset', async ({ page }) => {
  20 |   const startedAt = new Date().toISOString();
  21 |   const errors: string[] = [];
  22 |   const external: string[] = [];
  23 |   page.on('pageerror', e => errors.push(e.message));
  24 |   page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  25 |   await page.route('**/*', route => {
  26 |     const url = new URL(route.request().url());
  27 |     if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
  28 |     external.push(url.toString());
  29 |     return route.abort();
  30 |   });
  31 |   await page.setViewportSize({ width: 1440, height: 1100 });
  32 |   expect((await page.goto(ROUTE))?.status()).toBe(200);
  33 |   await page.evaluate(() => document.fonts.ready);
  34 |   const mount = page.locator('div.prose > div.rounded-md:has([data-testid="payback-months"])');
  35 |   await expect(mount).toHaveCount(1);
  36 |   const slider = mount.getByRole('slider', { name: /robot cost/i });
  37 |   const controls = [/robot cost/i, /integration multiple/i, /cycle time/i, /uptime/i, /per-pick success/i, /jam-clearing time/i, /displaced wage/i];
  38 |   const observations: unknown[] = [];
  39 |   async function observe(name: string, robotCost: number, caseId: string, prestate: string, action: string) {
  40 |     const input = { ...defaults, robotCost };
  41 |     const o = oracle(input);
  42 |     for (const [i, key] of (Object.keys(defaults) as (keyof typeof defaults)[]).entries()) {
  43 |       const control = mount.getByRole('slider', { name: controls[i] });
  44 |       await expect(control).toHaveValue(String(input[key]));
  45 |       for (const attribute of ['min', 'max', 'step'] as const) await expect(control).toHaveAttribute(attribute, String(ranges[key][attribute]));
  46 |     }
  47 |     await expect(slider.locator('xpath=following-sibling::p')).toContainText('not a sourced arm-price quote');
  48 |     await expect(mount).not.toContainText('$25k-$80k');
  49 |     const readouts = [];
  50 |     for (const [i, id] of ['cost-per-pick', 'payback-months'].entries()) {
  51 |       await expect(mount.getByTestId(id)).toHaveText(o.display[i]);
  52 |       readouts.push({ selector: `[data-testid="${id}"]`, text: (await mount.getByTestId(id).innerText()).trim() });
  53 |     }
  54 |     await expect(mount.getByTestId('payback-verdict')).toHaveText(o.paysBack ? 'Pays back inside 24 months' : 'Outside a 24-month horizon');
  55 |     await expect(mount).toContainText(o.summary);
  56 |     const bar = mount.getByTestId('time-breakdown');
  57 |     await expect(bar).toHaveAttribute('aria-label', `Time breakdown per elapsed hour: ${o.shares[0]} productive cycles, ${o.shares[1]} jam clearing, ${o.shares[2]} downtime`);
> 58 |     for (const [i, title] of ['Productive cycles', 'Jam clearing', 'Downtime'].entries()) expect(await bar.locator(`[title="${title}"]`).evaluate(e => (e as HTMLElement).style.width)).toBe(o.shares[i]);
     |                                                                                                                                                                                         ^ Error: expect(received).toBe(expected) // Object.is equality
  59 |     for (const [id, key, label] of [
  60 |       ['breakdown-productive', 'productive', 'productive'],
  61 |       ['breakdown-jams', 'jamClearing', 'jam clearing'],
  62 |       ['breakdown-downtime', 'downtime', 'downtime'],
  63 |     ] as const) await expect(mount.getByTestId(id)).toHaveText(`${label} ${o.timeBreakdown[key].toFixed(0)} s`);
  64 |     await expect(page.locator('p').filter({ hasText: /^This calculator is an authored worked example/ })).toContainText('not a sourced arm-price quote');
  65 |     await expect(page.locator('p').filter({ hasText: 'The calculator above reports capital cost per modeled pick' })).toContainText('It does not include running costs.');
  66 |     await mount.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100));
  67 |     observations.push({ name, input, mountId: 'mount:/data-hardware/industrial-deployment/:DeploymentEconomics:1',
  68 |       caseId, prestate, action, poststate: `${o.summary} ${o.display.join('; ')}; all seven inputs, notes, verdict, time shares and seconds checked`,
  69 |       readouts, ...await capture(page, name) });
  70 |   }
  71 |   await observe('default', 80000, 'default', 'Article not loaded', 'Navigate to existing article');
  72 |   await setSlider(slider, 20000);
  73 |   await observe('min', 20000, 'slider-boundaries-and-anchors', 'Default robotCost80000', 'Move robotCost to minimum20000');
  74 |   await setSlider(slider, 250000);
  75 |   await observe('max', 250000, 'slider-boundaries-and-anchors', 'Minimum robotCost20000', 'Move robotCost to maximum250000');
  76 |   await mount.getByRole('button', { name: 'Reset', exact: true }).click();
  77 |   await observe('reset', 80000, 'reset', 'Maximum robotCost250000', 'Activate Reset');
  78 |   const desktopAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  79 |   expect(desktopAxe.violations).toEqual([]);
  80 |   await page.setViewportSize({ width: 375, height: 812 });
  81 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  82 |   await observe('mobile-default', 80000, 'default', 'Desktop reset state', 'Resize existing mounted calculator to375px');
  83 |   const mobileAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  84 |   expect(mobileAxe.violations).toEqual([]);
  85 |   expect(errors).toEqual([]);
  86 |   expect(external).toEqual([]);
  87 |   if (producing) save('browser-run.json', {
  88 |     command: 'NODE_DISABLE_COMPILE_CACHE=1 ECONOMICS_WRITE_BROWSER=1 node_modules/.bin/playwright test tests/e2e/economics-local-evidence.spec.ts tests/e2e/industrial-deployment.spec.ts --workers=1 --retries=0 --reporter=line --output=audit/evidence/economics-local-20260923/playwright',
  89 |     runner: 'playwright', cwd: process.cwd(), environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
  90 |     startedAt, endedAt: new Date().toISOString(), exitCode: 0, test: artifact(BROWSER),
  91 |     dependencies: dependencies(true), observations, pageErrors: errors, externalRequests: external,
  92 |     desktopAxeViolations: desktopAxe.violations, mobileAxeViolations: mobileAxe.violations,
  93 |   });
  94 | });
  95 | 
```