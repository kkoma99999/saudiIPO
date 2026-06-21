# Allocation data verification

Every row below was sourced by automated research from reachable mirrors of the
official Tadawul allotment announcements (the announcement of subscription and
allotment results for individual investors), primarily Argaam English, with Sahm
Capital, Arab News, Zawya, and the CMA prospectus PDFs for cross-checks and advisor
rosters. The official saudiexchange.sa announcement is bot-blocked and was not used
directly.

Every row carries `allocation_verified = false`. A human should check each row against
its source and flip the flag in data/allocations.csv. Nothing here is invented: a field
the source did not state was left empty.

## Unit conventions in data/allocations.csv

- `retail_tranche_pct`, `allocation_factor`: plain percent numbers (10 means 10 percent).
- `retail_coverage_multiple`, `institutional_coverage_multiple`: times-subscribed
  multiples (subscribed divided by tranche size). Left empty where a source gave only
  a percent-oversubscribed phrasing with no clean multiple.
- `retail_shares_offered`, `min_allocation_shares`, `individual_subscribers_count`:
  integer share or subscriber counts.
- Dates are YYYY-MM-DD, the individual subscription window.

## Known caveats to check first

- Aramco (2222): `retail_tranche_pct` is recorded as 0.5, the share of total capital
  the individual tranche targeted, not its share of the offering (which was about one
  third). Confirm which basis the site should show.
- Coverage multiples derived by dividing a stated subscribed amount by the tranche size
  are flagged low confidence where the source's native wording was percent-oversubscribed.
- Some 2021 and earlier IPOs guaranteed a minimum only when subscribers stayed under a
  threshold; where subscribers exceeded it the minimum did not apply. The retail outcome
  still uses the stated minimum allocation, so check it against the source for those names.
- `min_allocation_shares` is the guaranteed minimum shares ALLOTTED per individual
  subscriber, not the minimum subscription size (the smallest application allowed). The
  two differ (Nahdi allotted a minimum of 3 while the minimum application was 10). This
  is the field the calculator uses, so it is the one most worth checking per row.
- Advisor roles were mapped to underwriter, financial_advisor, lead_manager, bookrunner.
  Receiving agents (جهة الاستلام) were removed, since they collect subscriptions rather
  than advise the deal. Bookrunner and underwriter rosters come from prospectuses and are
  the most likely to need trimming.

## Rows (73 sourced, 0 not found)

| Symbol | Company | Fields | Advisors | Source | Low-confidence fields |
|---|---|---|---|---|---|
| 2222 | Saudi Arabian Oil Co. | 10/12 | 17 | [link](https://www.argaam.com/en/article/articledetail/id/1333552) | institutionalCoverageMultiple, retailCoverageMultiple, allocationFactor, individualSubscribersCount, retailSharesOffered |
| 4013 | Dr. Sulaiman Al Habib Medical Services Group | 9/12 | 13 | [link](https://www.argaam.com/en/article/articledetail/id/1355097) | allocationFactor, prorataBasis |
| 1182 | Amlak International for Real Estate Finance Co. | 11/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1390508) | individualSubscribersCount, allocationFactor |
| 4161 | BinDawood Holding Co. | 10/12 | 7 | [link](https://www.argaam.com/en/article/articledetail/id/1414039) | retailSharesOffered, retailCoverageMultiple, advisors |
| 2081 | Alkhorayef Water and Power Technologies Co. (AWPT) | 8/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1447069) | minAllocationShares |
| 4261 | Theeb Rent a Car Co. | 10/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1453871) | retailCoverageMultiple, institutionalCoverageMultiple |
| 2281 | Tanmiah Food Co. | 10/12 | 5 | [link](https://www.argaam.com/en/article/articledetail/id/1485349) | retailCoverageMultiple, allocationFactor |
| 7202 | Arabian Internet and Communications Services Co. (solutions by stc) | 11/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1498943) | retailCoverageMultiple, institutionalCoverageMultiple, individualSubscribersCount |
| 2082 | International Company for Power and Water Projects (ACWA Power) | 11/12 | 23 | [link](https://www.argaam.com/en/article/articledetail/id/1500728) | allocationFactor, retailCoverageMultiple, prorataBasis |
| 4071 | Arabian Contracting Services Co. (Al Arabia) | 11/12 | 8 | [link](https://www.arabnews.com/node/1960691/business-economy) | allocationFactor, individualSubscribersCount |
| 4081 | Nayifat Finance Co. | 11/12 | 10 | [link](https://www.zawya.com/mena/en/press-releases/story/Nayifat_Finance_Company_announces_completion_of_the_offering_period_for_Individual_Investors-ZAWYA20211115094339/) | retailCoverageMultiple |
| 1111 | Saudi Tadawul Group Holding Co. | 10/12 | 15 | [link](https://www.argaam.com/en/article/articledetail/id/1517802) | allocationFactor, prorataBasis |
| 4162 | Almunajem Foods Co. | 10/12 | 7 | [link](https://www.arabnews.com/node/1987241/business-economy) | retailSharesOffered, institutionalCoverageMultiple |
| 1321 | East Pipes Integrated Company for Industry | 9/12 | 5 | [link](https://www.argaam.com/en/article/articledetail/id/1534959) | minAllocationShares, institutionalCoverageMultiple |
| 7203 | Elm Co. | 11/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1533943) | retailCoverageMultiple |
| 4014 | Scientific & Medical Equipment House Co. (SMEH) | 10/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1538872) | institutionalCoverageMultiple, retailCoverageMultiple, minAllocationShares |
| 4163 | Al-Dawaa Medical Services Co. | 10/12 | 8 | [link](https://www.zawya.com/en/press-release/companies-news/al-dawaa-medical-services-company-announces-results-of-the-offering-period-for-individual-investors-oyptvh5w) | retailCoverageMultiple, institutionalCoverageMultiple |
| 4164 | Nahdi Medical Co. | 11/12 | 12 | [link](https://www.argaam.com/en/article/articledetail/id/1542576) | minAllocationShares, retailCoverageMultiple, institutionalCoverageMultiple |
| 1322 | Almasane Alkobra Mining Co. (AMAK) | 10/12 | 7 | [link](https://www.arabnews.com/node/2042051) | individualSubscribersCount, allocationFactor, minAllocationShares |
| 1183 | Saudi Home Loans Co. | 11/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1549196) | institutionalCoverageMultiple |
| 4322 | Retal Urban Development Co. | 11/12 | 4 | [link](https://www.alfozan.com/press-releases/retals-ipo-tadawul-888x-covered-5-shares-allotted-subscriber) | individualSubscribersCount, allocationFactor |
| 6014 | Alamar Foods Co. | 11/12 | 7 | [link](https://www.zawya.com/en/press-release/companies-news/alamar-foods-announces-the-results-of-the-offering-period-for-individual-investors-xjrsi4uu) | allocationFactor |
| 2282 | Naqi Water Co. | 10/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1581506) | retailCoverageMultiple, advisors |
| 2381 | Arabian Drilling Co. | 11/12 | 10 | [link](https://www.argaam.com/en/article/articledetail/id/1596898) | - |
| 7204 | Perfect Presentation for Commercial Services Co. | 6/12 | 7 | [link](https://argaamplus.s3.amazonaws.com/2e2ebf77-b921-4973-9e6c-1c47ca0afce4.pdf) | retailCoverageMultiple, institutionalCoverageMultiple |
| 2083 | The Power and Water Utility Company for Jubail and Yanbu (MARAFIQ) | 11/12 | 9 | [link](https://www.arabnews.com/node/2193651/business-economy) | individualSubscribersCount, institutionalCoverageMultiple |
| 6015 | Americana Restaurants International PLC | 11/12 | 12 | [link](https://www.argaam.com/en/article/articledetail/id/1605527) | institutionalCoverageMultiple, allocationFactor, subscriptionStart, subscriptionEnd |
| 4142 | Riyadh Cables Group Co. | 11/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1604963) | retailCoverageMultiple, minAllocationShares |
| 4192 | Al-Saif Stores for Development & Investment Co. (Alsaif Gallery) | 9/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1611459) | individualSubscribersCount, retailCoverageMultiple |
| 2223 | Saudi Aramco Base Oil Co. (Luberef) | 11/12 | 24 | [link](https://www.argaam.com/en/article/articledetail/id/1610401) | allocationFactor |
| 1833 | Al Mawarid Manpower Co. | 11/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1652116) | minAllocationShares, retailCoverageMultiple |
| 4015 | Jamjoom Pharmaceuticals Factory Co. (Jamjoom Pharma) | 11/12 | 12 | [link](https://www.argaam.com/en/article/articledetail/id/1649273) | - |
| 4082 | Morabaha Marina Financing Company | 9/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1648807) | institutionalCoverageMultiple, retailCoverageMultiple |
| 2283 | First Milling Co. (First Mills) | 11/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1653080) | retailCoverageMultiple |
| 4262 | Lumi Rental Co. | 11/12 | 5 | [link](https://www.argaam.com/en/article/articledetail/id/1670615) | allocationFactor, prorataBasis |
| 2382 | ADES Holding Co. | 11/12 | 24 | [link](https://ipo.adesgroup.com/documents/Individual_Subscriber_Subscription_Results_Press_Release_ADES_Holding_Co_EN.pdf) | - |
| 4263 | SAL Saudi Logistics Services Co. | 11/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1677575) | institutionalCoverageMultiple |
| 4072 | MBC Group Co. | 11/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1693142) | retailSharesOffered |
| 4016 | Middle East Pharmaceutical Industries Co. (Avalon Pharma) | 11/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1703361) | individualSubscribersCount, institutionalCoverageMultiple |
| 2284 | Modern Mills Co. (Modern Mills for Food Products Co.) | 11/12 | 8 | [link](https://www.zawya.com/en/press-release/companies-news/modern-mills-company-announcement-of-completion-of-offering-period-for-individual-investors-and-final-allotment-of-shares-gt745i4w) | individualSubscribersCount, retailCoverageMultiple |
| 4017 | Dr. Soliman Abdel Kader Fakeeh Hospital Co. (Fakeeh Care Group) | 11/12 | 11 | [link](https://www.argaam.com/en/article/articledetail/id/1730953) | minAllocationShares |
| 2084 | Miahona Co. | 10/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1730940) | institutionalCoverageMultiple, individualSubscribersCount, retailSharesOffered |
| 1834 | Saudi Manpower Solutions Co. (SMASCO) | 11/12 | 7 | [link](https://ipo.smasco.com/wp-content/uploads/2024/05/SMASCO-Final-Allotment-Announcement-for-IPO_EN_V3.pdf) | none |
| 8313 | Rasan Information Technology Co. | 9/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1732229) | individualSubscribersCount, allocationFactor |
| 4143 | Al Taiseer Group Talco Industrial Co. | 10/12 | 7 | [link](https://www.argaam.com/en/article/articledetail/id/1734730) | minAllocationShares, individualSubscribersCount |
| 4165 | Almajed Oud Co. | 9/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1755313) | institutionalCoverageMultiple, individualSubscribersCount |
| 2285 | Arabian Mills for Food Products Co. | 11/12 | 7 | [link](https://www.argaam.com/en/article/articledetail/id/1755344) | minAllocationShares, retailCoverageMultiple |
| 2286 | Fourth Milling Co. | 10/12 | 6 | [link](https://www.argaam.com/en/article/articledetail/id/1764248) | allocationFactor, individualSubscribersCount |
| 1835 | Tamkeen Human Resources Co. | 11/12 | 18 | [link](https://www.argaam.com/en/article/articledetail/id/1768002) | allocationFactor |
| 4083 | United International Holding Co. | 10/12 | 19 | [link](https://www.argaam.com/en/article/articledetail/id/1771722) | institutionalCoverageMultiple, subscriptionEnd |
| 4018 | Almoosa Health Co. | 11/12 | 19 | [link](https://www.argaam.com/en/article/articledetail/id/1779004) | retailCoverageMultiple, allocationFactor, institutionalCoverageMultiple |
| 4193 | Nice One Beauty Digital Marketing Co. | 11/12 | 20 | [link](https://www.argaam.com/en/article/articledetail/id/1779326) | individualSubscribersCount, retailCoverageMultiple, institutionalCoverageMultiple |
| 4084 | Derayah Financial Co. | 11/12 | 4 | [link](https://ipo.derayah.com/assets/files/Derayah%20Financial-%20Retail%20and%20Final%20Allocation%20Announcement%20-%20English.pdf) | retailCoverageMultiple |
| 2287 | Arabian Company for Agricultural and Industrial Investment (Entaj) | 11/12 | 17 | [link](https://www.zawya.com/en/capital-markets/equities/entaj-ipo-saudi-poultry-firm-reduces-final-allotment-of-shares-for-retail-subscription-lit73kdk) | allocationFactor, institutionalCoverageMultiple |
| 4325 | Umm Al Qura for Development and Construction Co. | 11/12 | 9 | [link](https://www.argaam.com/en/article/articledetail/id/1797189) | advisors |
| 1323 | United Carton Industries Co. | 11/12 | 18 | [link](https://www.argaam.com/en/article/articledetail/id/1814699) | individualSubscribersCount |
| 4264 | Flynas Co. | 11/12 | 18 | [link](https://www.arabnews.com/node/2603187/business-economy) | institutionalCoverageMultiple |
| 4019 | Specialized Medical Co. (SMC Healthcare) | 11/12 | 21 | [link](https://www.argaam.com/en/article/articledetail/id/1821908) | institutionalCoverageMultiple |
| 6018 | Sport Clubs Co. | 11/12 | 22 | [link](https://www.argaam.com/en/article/articledetail/id/1827290) | individualSubscribersCount, retailSharesOffered, advisors |
| 4194 | Marketing Home Group for Trading Co. (Build Station / MHG) | 10/12 | 21 | [link](https://www.agbi.com/markets/2025/08/marketing-home-groups-retail-ipo-covered-200-times/) | retailCoverageMultiple, institutionalCoverageMultiple, prorataBasis, advisors |
| 4326 | Dar Al Majed Real Estate Co. | 11/12 | 22 | [link](https://www.argaam.com/en/article/articledetail/id/1837776) | retailCoverageMultiple |
| 4265 | Cherry Trading Co. | 11/12 | 22 | [link](https://www.argaam.com/en/article/articledetail/id/1860343) | institutionalCoverageMultiple |
| 6019 | Almasar Alshamil Education Co. (Al Masar Al Shamil Education Co.) | 11/12 | 20 | [link](https://www.argaam.com/en/article/articledetail/id/1861403) | retailSharesOffered, advisors |
| 4147 | Consolidated Grünenfelder Saady Holding Co. | 10/12 | 23 | [link](https://www.argaam.com/en/article/articledetail/id/1862944) | retailCoverageMultiple, allocationFactor, retailTranchePct |
| 4327 | Alramz Real Estate Co. | 7/12 | 19 | [link](https://ent.news/2025/12/82.pdf) | retailCoverageMultiple, minAllocationShares, individualSubscribersCount, allocationFactor |
| 1324 | Saleh Abdulaziz Al Rashed and Sons Co. | 11/12 | 23 | [link](https://www.argaam.com/en/article/articledetail/id/1883285) | retailCoverageMultiple |
| 7205 | Dar Albalad for Business Solutions Co. | 11/12 | 4 | [link](https://www.argaam.com/en/article/articledetail/id/1906666) | retailCoverageMultiple, institutionalCoverageMultiple |
| 1830 | Leejam Sports Co. | 11/12 | 11 | [link](https://www.argaam.com/ar/article/articledetail/id/565761) | allocationFactor, prorataBasis |
| 4291 | National Co. for Learning and Education | 10/12 | 6 | [link](https://www.argaam.com/ar/article/articledetail/id/578206) | allocationFactor, retailCoverageMultiple, institutionalCoverageMultiple, individualSubscribersCount, advisors |
| 7200 | Al Moammar Information Systems Co. (MIS) | 7/12 | 7 | [link](https://www.argaam.com/en/article/articledetail/id/599428) | institutionalCoverageMultiple, individualSubscribersCount, allocationFactor, retailCoverageMultiple |
| 4321 | Arabian Centres Co. (Cenomi Centers) | 8/12 | 16 | [link](https://www.zawya.com/en/press-release/arabian-centres-company-completion-of-ipo-h1axqzjq) | minAllocationShares, retailSharesOffered, allocationMethod |
| 1831 | Maharah Human Resources Co. | 8/12 | 10 | [link](https://www.argaam.com/en/article/articledetail/id/614132) | prorataBasis, allocationFactor, retailCoverageMultiple, institutionalCoverageMultiple |
| 4292 | Ataa Educational Co. | 10/12 | 8 | [link](https://www.argaam.com/en/article/articledetail/id/1301280) | institutionalCoverageMultiple, retailCoverageMultiple |

