### Lesson Info

Lesson Number841Lesson Date1994-12-01Submitting Organizationjsc

* * *

#### Similar Lessons

- [Availability, Cost and Resource Allocation (ACARA) Model to Support Maintenance Requirements](https://llis.nasa.gov/lesson/829)


1994-11-30

- [Benefits of Implementing Maintainability on NASA Programs](https://llis.nasa.gov/lesson/835)


1994-12-01

- [Maintenance Concept For Space Systems](https://llis.nasa.gov/lesson/724)


1994-12-01

- [Quantitative Reliability Requirements Used as Performance-Based Requirements for Space Systems](https://llis.nasa.gov/lesson/827)


1999-02-01

- [Maintainability Program Management Considerations](https://llis.nasa.gov/lesson/831)


1994-12-01

- [Fiber Optic Systems](https://llis.nasa.gov/lesson/881)


1994-12-01

- [Designing for Dormant Reliability](https://llis.nasa.gov/lesson/684)


1999-02-01

- [Predictive Maintenance Program](https://llis.nasa.gov/lesson/849)


1994-12-01

- [Fault-Detection, Fault-Isolation and Recovery (FDIR) Techniques](https://llis.nasa.gov/lesson/839)


1994-12-01

- [Critical Facilities Maintenance Assessment](https://llis.nasa.gov/lesson/1764)


2006-07-26


### Subject

_**Availability Prediction and Analysis**_

### Abstract

None

### Driving Event

This Lesson Learned is based on Maintainability Technique number AT-3 from NASA Technical Memorandum 4628, Recommended Techniques for Effective Maintainability.

Benefit:

Availability prediction and assessment methods can provide quantitative performance measures that may be used in assessing a given design or to compare system alternatives to reduce life cycle costs. This technique increases the probability of mission success by ensuring operational readiness. Analyses based on availability predictions will help assess design options and can lead to definition of maintenance support concepts that will increase future system availability, anticipate logistics and maintenance resource needs, and provide long term savings in operations and maintenance costs based on optimization of logistics support.

Implementation Method:

Availability can be predicted or estimated using various methods and measures. Availability is a characteristic of repairable or restorable items or systems, and assumes that a failed item can be restored to operation through maintenance, reconfiguration, or reset. It is a function of how often a unit fails (reliability) and how fast the unit can be restored after failure (maintainability). A foundation to support both the establishment of reliability and maintainability (R&M) parameters and trade-offs between these parameters is created by availability prediction before analyses. Availability can be estimated for components, items, or units, but overall spacecraft system or ground system availability estimation is based on the combinations and connectivity of the units within the system that perform the functions, i.e., the series and redundant operations paths.

Availability Measures

One basic measure of availability, called inherent availability, is useful during the design process to assess design characteristics. The measure involves only the as-designed reliability and maintainability characteristics and can be calculated using the estimated mean-time-between-failure (MTBF) and mean-time-to repair (MTTR) parameters. The predicted or estimated measure of inherent availability is calculated as:

![refer to [D] description](https://llis.nasa.gov/llis_lib/images/1009356main_0841-1.jpg)[\[D\]](https://llis.nasa.gov/llis_lib/txt/1009831main_0841-1.txt)

The MTTR time in the inherent availability calculation does not include such times as administrative or logistic delay time, which generally are beyond the control of the designer, and does not include preventive maintenance time. However, effective trade-offs using the basic times and parameters are possible. Trade-off techniques and some sample uses are included in Reference 1, Section 5.5.

Another measure of availability, achieved availability or Aa, can be expressed as:

![refer to [D] description](https://llis.nasa.gov/llis_lib/images/1009357main_0841-2.jpg)[\[D\]](https://llis.nasa.gov/llis_lib/txt/1009832main_0841-2.txt)

where OT is the total time spent in an operating state, TCM is the total corrective maintenance time that does not include before-and-after maintenance checks, supply, or administrative waiting periods; and TPM is the total time spent performing preventive maintenance. Aa is more specifically directed toward the hardware characteristics than the operational availability measure, which considers the operating and logistics policies.

A third basic measure of availability, operational availability, considers all repair time: corrective and preventive maintenance time, administrative delay time, and logistic support time. This is a more realistic definition of availability in terms providing a measure to assess alternative maintenance and logistics support concepts associated with the operation of a system or function. It is usually defined by the equation:

![refer to [D] description](https://llis.nasa.gov/llis_lib/images/1009358main_0841-3.jpg)[\[D\]](https://llis.nasa.gov/llis_lib/txt/1009833main_0841-3.txt)

where Uptime is the total time a system is in an operable state, and Downtime is the total time the system is in an inoperable state. The sum of Uptime and Downtime, or Total Time, is usually known, specified as a requisite operating time, or is a given time to perform a critical function. Downtime often is broken down into a variety of subcategories such as detection and diagnosis time, time waiting for repair parts, actual unit repair or replacement time, test and checkout time, etc. Table 1 shows the basic difference between the availability measures defined above.

![refer to [D] description](https://llis.nasa.gov/llis_lib/images/1009359main_0841-4.jpg)[\[D\]](https://llis.nasa.gov/llis_lib/txt/1009834main_0841-4.txt)

Table 1: Commonly Used Availability Measures


System or Function Availability Estimation

System/function availability estimates may be derived in a limited fashion by algebraically combining mean value estimates of the system units, or more rigorously by using computer- aided simulation methods.

Mean Value Estimation

Mean value estimation of system availability is usually performed by algebraically combining component, LRU, and ORU availabilities calculated using equation (1). When the system is composed of a number of components, LRU's, or ORU's, the failure of any one of which results in the system being down, the system availability is calculated from the product of these units' availability. When the system involves item redundancy, redundant block availability estimates can be calculated using simple Boolean mathematical decomposition procedures similar to reliability block diagram solution methods. See Reference 1, Section 10.4.

Computer-Aided Simulation

Availability prediction using computer-aided simulation modeling may use either a stochastic simulation or a Markov model approach. Stochastic simulation modeling uses statistical distributions for the system's reliability, maintainability, and other maintenance and delay time parameters. These distributions are used as mathematical models for estimating individual failure and restoration times and can include failure effects and other operational conditions. A computer program generates random draws from these distributions to simulate when the system is up and down, maintains tables of failures, repairs, failure effects, etc., and tracks system or function capability over time. These data may then be used to calculate and output system operational availability estimates using equation (2).

Stochastic Simulation Methods

Discrete event stochastic simulation programs are recommended to perform operational availability predictions and analyses for large, repairable systems such as the space station or large ground systems and facilities. These methods simulate and monitor the availability status of defined systems or functions that are composed of a collection of Replaceable Units (RUs). The following process is generally used:

1. Generate simulated future failure times for each designated RU based on predicted RU reliability distributions and parameters.
2. Step through simulated operating time, and when failure events are encountered, evaluate the failure impact or function status given the specific failures encountered.
3. Repair or replace the failed RU using a maintenance policy and procedure based on the availability of required maintenance resources, priority or criticality of the failure, or the current system or function status. Once an RU is repaired or replaced, the system or function status is reset appropriately, and a future failure time for the RU is again generated.
4. Generation of simulated failures and maintenance actions for RUs requires as input the estimated RU time-to-failure distribution model parameters and factors that define the frequency of other scheduled or unscheduled maintenance. The maintenance actions can include equipment failures, preventive maintenance tasks, and environmentally or human-induced failures.

To evaluate the effect of a simulated failure on the function's operational capability at a particular point in time, minimal cut sets of failure events that define the system or function failure conditions can be used. Minimal cut sets of failure events can be generated from reliability block diagrams or fault tree analysis of the functions, and then used during a simulation run to dynamically determine queuing priorities based upon functional criticality and the current level of remaining redundancy after the simulated failure occurs.

Maintenance is simulated by allocating available maintenance resources and spare parts to the awaiting maintenance action (or waiting for resources to become available). Groups of maintenance actions may also be packaged into shifts of work. If the system under consideration is in a space environment, both external (extravehicular activity or EVA) or internal (intravehicular activity or IVA) can be considered.

When the stochastic simulation method is used, each run of the simulation model (called an iteration) will yield a single value of the availability measure that depends on the chance component or unit failures and repairs that happened during that iteration. Therefore, many iterations are required to cover as many potential failure situations as possible, and to give the analyst a better understanding of the variation in the resulting availability as a function of the variations in the random failure and repair process. The number of iterations required for accurate availability measure results will depend on the iteration to iteration variation in the output measure. Experience has shown that in system availability simulations with a large iteration-o-iteration variation, 200 to 1000 iterations or more may be required to obtain a statistically accurate estimate of the average system availability.

For example, the Reliability and Maintainability Assessment Tool (RMAT) is a stochastic computer-aided simulation method like that described that has been used at Johnson Space Center for assessing the maintainability and availability characteristics of the Space Station. The output of the RMAT includes the percent of total (or specified mission) time each defined space station function spends in a "down" state as well as the percent of time each defined function is one failure away from functional outage (is zero failure tolerant). Using RMAT, analysts at JSC have been able to perform trade studies that quantify the differences between alternative Space Station configurations in terms of their respective operational availability and maintainability measure estimates.

The same simulation methods (such as RMAT) that provide for operational availability measures will also provide maintenance resource usage measures such as maintenance manpower needs and spare part requirements. With this capability, JSC has been able to estimate the maintenance manpower needs, including EVA requirements, of various Space Station alternative configurations.

Markov Model Approach

A Markov process, or state-space analysis is a mathematical tool particularly well suited to computer simulation of the availability of complex systems when the necessary assumptions are valid. This analysis technique also is well adapted to use in conjunction with Fault Tree Analysis or Reliability Block Diagram Analysis (RBDA). Examples of the use of Markov process analysis may be found in Reference 1 or in such standard reliability textbooks as Reference 2.

Failure to use availability predictions and analysis during the design process may lead to costly sub-optimization of the as-designed system reliability and maintainability characteristics. Where operations and support costs are a major portion of the life cycle costs, availability prediction and analysis are critical to understanding the impact of insufficiently defined maintenance resources (personnel, spare parts, test equipment, facilities, etc.), and maintenance concepts on overall system operational availability and mission success probabilities. These analyses can therefore greatly reduce the life cycle costs associated with deploying and supporting a space or ground system.

References:

1. MIL-HDBK-338; Electronic Reliability Design Handbook, Reliability Analysis Center, Rome, NY, 1989.
2. O'Connor, P.D.T.; Practical Reliability Engineering, John Wiley & Sons Ltd., Chichester, 1991.

### Lesson(s) Learned

Availability estimation is a valuable design aid and assessment tool for any system whose operating profile allows for repair of failed units or components. These systems include those that operate on earth such as control centers, system test facilities, or flight simulation systems/facilities. Applying availability prediction and analysis techniques is also an extremely valuable process for guiding the development of maintenance concepts and requirements.

### Recommendation(s)

Estimate or predict the future availability of a system, function, or unit where availability is defined as the probability that the system, function, or unit will be in an operable state at a random time. Availability may be assessed for a single component, a repairable unit, a replaceable unit, a system of many replaceable units, or a function performed by multiple systems.

### Evidence of Recurrence Control Effectiveness

This practice has been used on the International Space Station Program.

### Program Relation

N/A

### Program/Project Phase

None

### Mission Directorate(s)

- Aeronautics Research
- Human Exploration and Operations
- Science

### Topic(s)

- None