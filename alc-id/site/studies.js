/** Research library for the ALC ID bracelet.
 *  Add a study by copying an object into STUDIES.
 *  pdf is the filename in the project folder (one level above this site).
 */
const STUDIES = [
  {
    id: "fairbairn-2024-accuracy",
    title: "A wearable alcohol biosensor: Exploring the accuracy of transdermal drinking detection",
    authors: "Catharine E. Fairbairn, Jiaxu Han, Eddie P. Caumiant, Aaron S. Benjamin, Nigel Bosch",
    year: 2024,
    yearLabel: "2024",
    journal: "Drug and Alcohol Dependence",
    organization: "University of Illinois Urbana-Champaign",
    partners: "Psychology; School of Information Sciences; Educational Psychology",
    device: "Wrist sensor",
    setting: "Lab and field",
    pdf: "elsevier-wearable-alcohol-biosensor-report-2024.pdf",
    researched:
      "One hundred regular drinkers attended three laboratory sessions that varied the alcohol dose, the speed of drinking, and the environment, then wore a compact wrist sensor in daily life for 14 days while giving breath-alcohol readings. Machine learning turned the sensor stream into a drinking estimate, using only readings collected before each breath test. The study asked whether a fast-sampling wrist sensor (a reading every 20 seconds) can detect drinking as it happens, including high-risk levels at 0.08% and above.",
    found:
      "The project collected 5.39 million transdermal readings (28,615 hours) and 12,699 breath tests. Real-time drinking detection was strong across the lab and the field: AUROC 0.966, sensitivity 89.8%, specificity 90.6%. Telling high-risk drinking apart was strong when all of the data were included (AUROC 0.941) and only intermediate when the model looked only at drinking episodes (AUROC 0.738). The authors point to long-term health tracking, medical monitoring, and just-in-time relapse prevention as uses."
  },
  {
    id: "richards-2024-blackouts",
    title: "Transdermal alcohol concentration features predict alcohol-induced blackouts in college students",
    authors: "Veronica L. Richards, Shannon D. Glenn, Robert J. Turrisi, Kimberly A. Mallett, Sarah Ackerman, Michael A. Russell",
    year: 2024,
    yearLabel: "2024",
    journal: "Alcohol: Clinical and Experimental Research",
    organization: "Pennsylvania State University",
    partners: "Edna Bennett Pierce Prevention Research Center; Biobehavioral Health",
    device: "Transdermal sensor",
    setting: "Field",
    pdf: "Alcohol-Clinical-Experimental-Research-2024-Richards-Transdermal-alcohol-concentration-features-predict.pdf",
    researched:
      "College students ages 18-22 who already drank heavily and had at least one alcohol-induced blackout wore a transdermal sensor for three days each weekend, across four weekends, and completed daily diaries. The study asked whether three features of the alcohol curve - how fast it rises, how high it peaks, and how long the rise lasts - predict a blackout that day.",
    found:
      "Seventy-nine students took part (average age 20.1), and 89.9% of diaries were completed. A faster rise (odds ratio 2.69), a higher peak (2.93), and a longer rise (4.16) each raised the odds of a blackout that day. How someone drinks, measured from the sensor curve, predicted blackouts beyond drink count alone. Speed, peak height, and time-to-peak each carried its own implication for prevention."
  },
  {
    id: "courtney-2023-skyn-28-days",
    title: "Acceptability and validity of using the BACtrack Skyn wrist-worn transdermal alcohol concentration sensor to capture alcohol use across 28 days under naturalistic conditions",
    authors: "Jimikaye B. Courtney, Michael A. Russell, David E. Conroy",
    year: 2023,
    yearLabel: "2023",
    journal: "Alcohol",
    organization: "Pennsylvania State University",
    partners: "College of Health and Human Development",
    device: "BACtrack Skyn",
    setting: "Field",
    pdf: "Penn-State-BACtrack-Skyn-Validation-Study-2023.pdf",
    researched:
      "Eleven adults ages 26-37 wore both a BACtrack Skyn wrist sensor and a SCRAM ankle monitor for 28 days in their normal routines. They also completed morning drinking reports and start/stop surveys. The study asked whether Skyn is acceptable and valid over a full month, compared with self-report and with SCRAM.",
    found:
      "People strongly preferred wearing Skyn over SCRAM. Usable Skyn data covered 74.2% of hours. About 20.7% was lost to syncing or charging, and 5.1% was lost because the device was taken off. Agreement on whether a day included drinking was 55.5% versus self-report and 70.3% versus SCRAM. Skyn tracked SCRAM well for the area under the curve (correlation 0.80) and more moderately for peak (0.54) and drinking duration (0.63). Links with self-report were weaker: peak 0.35, area under the curve 0.52, estimated BAC 0.30."
  },
  {
    id: "gunn-2023-practical",
    title: "Use of the BACtrack Skyn alcohol biosensor: Practical applications for data collection and analysis",
    authors: "Rachel L. Gunn, Jennifer E. Merrill, Anne M. Haines, Mary Ellen Fernandez, Timothy Souza, Benjamin L. Berey, Robert F. Leeman, Yan Wang, Nancy Barnett",
    year: 2023,
    yearLabel: "2023",
    journal: "Addiction",
    organization: "Brown University",
    partners: "University of Florida; Northeastern University",
    device: "BACtrack Skyn",
    setting: "Methods",
    pdf: "Addiction-2023-Gunn-Use-of-the-BACtrack-Skyn-alcohol-biosensor-Brown-University.pdf",
    researched:
      "A methods paper drawn from several laboratory and field pilots, plus a 7-day diary study that looked at environmental alcohol (alcohol near the sensor that did not come from drinking). It sets out six problems that show up when Skyn data are collected and processed, and recommends ways to handle each one.",
    found:
      "The six problems are identifying alcohol that was actually consumed, separating environmental alcohol from drinking, finding missing or invalid data and its source, keeping people wearing the device, combining Skyn with self-report, and what those choices mean for statistics. Their TASMAC version 2.0 software flags drinking events, gaps, and environmental alcohol and lines the sensor up with surveys. A careful orientation and regular contact during field studies reduce missing data and improve adherence."
  },
  {
    id: "ash-2022-yale",
    title: "Sensitivity, specificity, and tolerability of the BACtrack Skyn compared to other alcohol monitoring approaches among young adults in a field-based setting",
    authors: "Garrett I. Ash, Ralitza Gueorguieva, Nancy P. Barnett, Wuyi Wang, David S. Robledo, Kelly S. DeMartini, Brian Pittman, Nancy S. Redeker, Stephanie S. O'Malley, Lisa M. Fucito",
    year: 2022,
    yearLabel: "2022",
    journal: "Alcohol: Clinical and Experimental Research",
    organization: "Yale School of Medicine",
    partners: "Brown School of Public Health; VA Connecticut; Yale School of Public Health; Yale School of Nursing",
    device: "BACtrack Skyn",
    setting: "Field",
    pdf: "BACtrack-Skyn-Study-Yale-School-of-Medicine-2.28.22.pdf",
    researched:
      "High-risk young drinkers (median age 21) wore Skyn and the SCRAM ankle monitor for 1-6 days, drank as usual, and kept a mobile diary. The first group (27 people, 101 person-days) was used to set transdermal cutoffs for heavy drinking, above-moderate drinking, and any drinking. Those cutoffs were then tested on a second group (20 people, 57 person-days).",
    found:
      "On devices tested within three months of shipment, sensitivity was 94% for heavy drinking, 78% for above-moderate drinking, and 69% for any drinking, with 91% specificity. Devices three months or older were less accurate (AUC 0.87 versus 0.79). The same cutoff on the second group was not specific enough (70%). People tolerated Skyn much better than SCRAM. Scoring rules from one batch of devices did not hold up across later devices and months of use."
  },
  {
    id: "wang-2021-usability",
    title: "Wrist-worn alcohol biosensors: Applications and usability in behavioral research",
    authors: "Yan Wang, Daniel J. Fridberg, Destin D. Shortell, Robert F. Leeman, Nancy P. Barnett, Robert L. Cook, Eric C. Porges",
    year: 2021,
    yearLabel: "2021",
    journal: "Alcohol",
    organization: "University of Florida",
    partners: "University of Chicago; Yale School of Medicine; Brown University",
    device: "BACtrack Skyn",
    setting: "Lab and field",
    pdf: "Yan-Wang-et-al-Wrist-worn-alcohol-biosensors-Applications-and-usability-in-behavioral-research.pdf",
    researched:
      "Three pilot studies of the BACtrack Skyn. Study 1 (3 people) compared Skyn, the SCRAM ankle monitor, and breath alcohol in the laboratory. Study 2 (10 people) compared Skyn with breath alcohol during a real drinking episode. Study 3 (12 people) wore Skyn for two weeks in daily life. Studies 2 and 3 also collected usability and acceptability ratings.",
    found:
      "In the lab, Skyn's curve closely resembled the validated SCRAM anklet. In the field, Skyn detected drinking for all 10 people (peak breath alcohol from 0.02 to 0.21), on average 35.6 minutes after they said drinking started, give or take 10.2 minutes. Over two weeks it recorded continuous data with multiple drinking episodes. Participants in both field studies rated Skyn highly acceptable."
  },
  {
    id: "rosenberg-2021-college",
    title: "Wearable alcohol monitors for alcohol use data collection among college students: feasibility and acceptability in a pilot study",
    authors: "Molly Rosenberg, Christina Ludema, Sina Kianersi, Maya Luetke, Kristen Jozkowski, Lucia Guerra-Reyes, Patrick C. Shih, Peter Finn",
    year: 2021,
    yearLabel: "2021",
    journal: "medRxiv preprint (not peer reviewed)",
    organization: "Indiana University",
    partners: "School of Public Health-Bloomington; Luddy School of Informatics; Psychological and Brain Sciences",
    device: "BACtrack Skyn",
    setting: "Field",
    pdf: "Wearable-alcohol-monitors-for-alcohol-use-data-collection-among-college-students-feasibility-and-acceptability-in-a-pilot-study.pdf",
    researched:
      "Five Indiana University undergraduates wore BACtrack Skyn wristbands continuously for five days in September 2019 and completed daily surveys about their drinking in the previous 24 hours. The study asked whether college students can use the monitor, whether they find it acceptable, and whether detected drinking lines up with what they report.",
    found:
      "Acceptability averaged 4.3 out of 5 (range 3.3 to 5.0) on the Acceptability of Intervention Measure. The sensors produced 589 hours of data and 24 of 25 possible monitoring days. Students reported 15 drinking events; the monitors detected 12. Self-reported start times matched the sensor closely (Spearman's rho = 0.9). The number of drinks matched the size of each sensor peak, measured as area under the curve (Pearson's r = 0.7). This paper is a preprint and was not certified by peer review."
  },
  {
    id: "leeman-2021-steady",
    title: "A combined laboratory and field test of a smartphone breath alcohol device and blood alcohol concentration estimator to facilitate moderate drinking among young adults",
    authors: "Robert F. Leeman, Benjamin L. Berey, Tessa Frohe, Bonnie H. P. Rowland, Matthew P. Martens, Lisa M. Fucito, Michael Stellefson, Sara Jo Nixon, Stephanie S. O'Malley",
    year: 2021,
    yearLabel: "2021",
    journal: "Psychology of Addictive Behaviors",
    organization: "University of Florida",
    partners: "Yale School of Medicine; Brown University; University of Washington; Boston University; University of Missouri; University of Alabama",
    device: "Breathalyzer and app",
    setting: "Lab and field",
    pdf: "Leeman-STEADY-paper.pdf",
    researched:
      "Ninety-nine young adults who drink heavily (average age 23) received a brief motivational interview, then were assigned one of three tools: a smartphone breathalyzer, an app that estimates blood alcohol from sex, weight, and drinks over time, or texting after each drink. They tried the assigned tool in a small-group laboratory drinking session, then had all three tools for two weeks in daily life. The study asked whether these tools are feasible, acceptable, and usable for moderate drinking.",
    found:
      "How much people drank in the lab did not differ by which tool they were assigned. The breathalyzer and the BAC estimator were acceptable and usable. In the field, people used at least one tool on 67% of drinking days. In an exploratory comparison with their own baseline, drinking fell by nearly one drink per drinking day. That drop was not from a controlled test of whether the tools cause people to drink less. This study uses a breath device and an estimator app, not a wrist biosensor."
  },
  {
    id: "fairbairn-kang-timing",
    title: "Temporal dynamics of transdermal alcohol concentration measured via new-generation wrist-worn biosensor",
    authors: "Catharine E. Fairbairn, Dahyeon Kang",
    year: null,
    yearLabel: "In press",
    journal: "Alcohol: Clinical and Experimental Research",
    organization: "University of Illinois Urbana-Champaign",
    partners: "Department of Psychology",
    device: "BACtrack Skyn",
    setting: "Lab",
    pdf: "Fairbairn-et-al-ACER-In-Press-Temporal-Dynamics-of-Transdermal-Alcohol-Concentration-Measured-via-New-Generation-Wrist-Worn-Biosensor.pdf",
    researched:
      "Thirty people in the laboratory received either alcohol aimed at a breath alcohol of 0.08% or a nonalcoholic drink. Each person wore a BACtrack Skyn prototype on the wrist and a SCRAM monitor on the ankle, and stayed until breath alcohol dropped below 0.025%. The study asked how long the wrist sensor lags behind breath alcohol, compared with the ankle monitor.",
    found:
      "Among devices that worked, both Skyn and SCRAM tracked breath alcohol strongly, and both detected alcohol within 30 minutes of the first drink. Skyn peaked 54 minutes after peak breath alcohol; SCRAM peaked 120 minutes after. Across the curve, Skyn lagged breath alcohol by about 24 minutes and SCRAM by about 69 minutes. The prototype failed more often (18-38%) than SCRAM (2%). The copy in this folder is marked in press."
  },
  {
    id: "fairbairn-bosch-review",
    title: "A new generation of transdermal alcohol biosensing technology: Practical applications, machine learning analytics, and questions for future research",
    authors: "Catharine E. Fairbairn, Nigel Bosch",
    year: null,
    yearLabel: "In press",
    journal: "Addiction",
    organization: "University of Illinois Urbana-Champaign",
    partners: "Department of Psychology; School of Information Sciences",
    device: "Review",
    setting: "Review",
    pdf: "Fairbairn_Bosch_Transdermal_State_of_Science_In_Press_Addiction.pdf",
    researched:
      "A review, not a new experiment. It covers transdermal sensor studies to date, which study methods seem to drive the accuracy those studies report, newer wrist sensors that pair with a phone and sample quickly, machine learning suited to that data, and what level of accuracy and timing different uses actually require.",
    found:
      "Ankle abstinence monitors have already been used with hundreds of thousands of people, but turning a transdermal reading into a precise blood-alcohol number is much harder, because the relationship is complex and delayed. Newer wrist sensors and machine learning widen what these devices can be used for, from abstinence checks to finer tracking of how someone is drinking. The paper maps those uses and the open questions, rather than reporting one accuracy number. The copy in this folder is marked in press."
  },
  {
    id: "ucsd-2016-skin-patch",
    title: "Flexible wearable electronic skin patch offers new way to monitor alcohol levels",
    authors: "Jayoung Kim, Itthipon Jeerapan, Somayeh Imani, Thomas N. Cho, Amay Bandodkar, Stefano Cinti, Patrick P. Mercier, Joseph Wang",
    year: 2016,
    yearLabel: "2016",
    journal: "ACS Sensors, reported by UC San Diego Today",
    organization: "University of California San Diego",
    partners: "Center for Wearable Sensors; Nanoengineering; Electrical Engineering",
    device: "Skin patch",
    setting: "Lab",
    url: "https://today.ucsd.edu/story/flexible_wearable_electronic_skin_patch_offers_new_way_to_monitor_alcohol_l",
    researched:
      "Engineers at UC San Diego built a flexible skin patch made of two pieces: a temporary tattoo that brings sweat to the skin and detects alcohol, and a flexible circuit board that snaps on with a magnet and sends the reading to a phone by Bluetooth. The question was whether a wearable patch can estimate blood alcohol from sweat in about 15 minutes, without the person already sweating, and whether the reading still holds when the patch is bent or shaken. This card summarizes the university news story. The study itself is the ACS Sensors paper Noninvasive Alcohol Monitoring Using a Wearable Tattoo-Based Iontophoretic-Biosensing System.",
    found:
      "Nine healthy volunteers wore the tattoo on their arms before and after one beer or a glass of red wine. The patch readings matched their blood alcohol concentrations, and they stayed accurate after repeated bending and shaking. The tattoo uses pilocarpine to draw sweat, then an electrode coated with alcohol oxidase. The story contrasts this with sensors that read insensible sweat, which can lag blood alcohol by up to two hours. The team said a next version would aim to monitor alcohol for 24 hours. There is no PDF of this story in the folder, so the card links to the UC San Diego article."
  }
];
