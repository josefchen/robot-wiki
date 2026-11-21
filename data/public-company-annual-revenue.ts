import type { ListingCurrency } from './schemas/public-company.ts';

/** Issuer-level annual revenue in the reporting currency, as filed by the market snapshot date. */
export interface AnnualRevenue {
  amount: number;
  currency: ListingCurrency;
  yearEnd: string;
  sourceTitle: string;
  sourceUrl: string;
  scope?: 'Continuing operations' | 'Operating predecessor';
}

export const ANNUAL_REVENUE: Readonly<Partial<Record<string, AnnualRevenue>>> = {
  'abb': {
    amount: 33_220_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'ABB financial report, consolidated income statement',
    sourceUrl: 'https://library.e.abb.com/public/b32991481e8b4418a5c5261c5ff25440/ABB%20Financial%20Report%202025.pdf',
    scope: 'Continuing operations',
  },
  'aerovironment': {
    amount: 1_976_845_000, currency: 'USD', yearEnd: '2026-04-30',
    sourceTitle: 'Form 10-K, filed 2026-06-29',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1368622/000110465926078906/avav-20260430x10k.htm',
  },
  'agility-robotics': {
    amount: 1_782_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Merger prospectus, Agility Robotics historical net sales',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/2074973/000121390026109058/ea0297114-07.htm',
    scope: 'Operating predecessor',
  },
  'alphabet': {
    amount: 402_836_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-05',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm',
  },
  'amazon': {
    amount: 716_924_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-06',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1018724/000101872426000004/amzn-20251231.htm',
  },
  'amc-robotics': {
    amount: 5_980_847, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-04-20',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1937891/000149315226018144/form10-k.htm',
  },
  'amicro-technology': {
    amount: 406_721_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 338',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/1030/2026103002447.pdf#page=338',
  },
  'aurora-innovation': {
    amount: 3_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-11',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1828108/000182810826000016/aur-20251231.htm',
  },
  'autostore': {
    amount: 541_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, disaggregated revenue, PDF p. 194',
    sourceUrl: 'https://www.autostoresystem.com/hubfs/10%20Website/Investor%20relations/2025%20Documents/Annual%20and%20Special%20General%20Meetings%202025/Annual%20Report%202025.pdf?hsLang=en',
  },
  'bigwave-robotics': {
    amount: 20_743_317_886, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Final IPO prospectus, FY2025 consolidated statement of comprehensive income',
    sourceUrl: 'https://dart.fss.or.kr/report/viewer.do?rcpNo=20260914000385&dcmNo=11578761&eleId=36&offset=4375145&length=700032&dtd=dart4.xsd',
  },
  'brils': {
    amount: 23_759_233_406, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Final IPO prospectus, FY2025 consolidated statement of comprehensive income',
    sourceUrl: 'https://dart.fss.or.kr/report/viewer.do?rcpNo=20260916000240&dcmNo=11581402&eleId=36&offset=3288099&length=797472&dtd=dart4.xsd',
  },
  'camsense-technologies': {
    amount: 613_523_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 319',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0922/2026092200005.pdf#page=319',
  },
  'cidi': {
    amount: 884_788_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 111',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0417/2026041701289.pdf#page=111',
  },
  'clobot': {
    amount: 41_406_081_428, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/20/000501/20260320001990/11011.htm#toc_19',
  },
  'cosmo-robotics': {
    amount: 8_862_835_366, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'FY2025 audited consolidated financial statements',
    sourceUrl: 'https://dart.fss.or.kr/report/viewer.do?rcpNo=20260326000497&dcmNo=11181050&eleId=3&offset=12370&length=462591&dtd=dart4.xsd',
  },
  'curexo': {
    amount: 74_531_816_400, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/17/000079/20260317000173/11011.htm#toc_19',
  },
  'cyberdyne': {
    amount: 3_846_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Fiscal 2026 consolidated statement of profit or loss, PDF p. 13',
    sourceUrl: 'https://www.cyberdyne.jp/media/25104/20260514_tanshin_eng.pdf#page=13',
  },
  'daifuku': {
    amount: 660_724_000_000, currency: 'JPY', yearEnd: '2025-12-31',
    sourceTitle: 'Annual general meeting, consolidated statement of income, PDF p. 68',
    sourceUrl: 'https://www.daifuku.com/ir/assets/110soukai_1e.pdf#page=68',
  },
  'daihen': {
    amount: 237_735_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Fiscal 2026 consolidated income statement, PDF p. 9',
    sourceUrl: 'https://www.daihen.co.jp/ir/summary_pdf/2026_0511_kessan.pdf#page=9',
  },
  'direct-drive-tech': {
    amount: 281_715_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 305',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0921/2026092100065.pdf#page=305',
  },
  'dobot': {
    amount: 492_209_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 150',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0330/2026033001834.pdf#page=150',
  },
  'doosan-robotics': {
    amount: 32_978_338_354, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/18/002234/20260318010436/11011.htm#toc_19',
  },
  'draganfly': {
    amount: 7_731_163, currency: 'CAD', yearEnd: '2025-12-31',
    sourceTitle: 'Fiscal 2025 consolidated financial results filed on Form 6-K',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1786286/000149315226012432/ex99-1.htm',
  },
  'eacon-group': {
    amount: 1_435_299_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 295',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0629/2026062900135.pdf#page=295',
  },
  'ecovacs': {
    amount: 19_039_662_854.51, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue, PDF p. 7',
    sourceUrl: 'http://dataclouds.cninfo.com.cn/shgonggao/hsomarket/2026/20260424/fbbd183ece4546f9823dae0fc927298b.PDF',
  },
  'edge-medical': {
    amount: 455_715_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 85',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042804709.pdf#page=85',
  },
  'efort-intelligent-equipment': {
    amount: 932_129_400, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report summary, group revenue, PDF p. 14',
    sourceUrl: 'https://static.cninfo.com.cn/finalpage/2026-04-15/1225101803.PDF',
  },
  'ehang': {
    amount: 417_981_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, filed 2026-05-15',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1759783/000119312526226608/d39307d20f.htm',
  },
  'estun-automation': {
    amount: 4_888_010_963.64, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report',
    sourceUrl: 'https://www.hkexnews.hk/listedco/listconews/sehk/2026/0331/2026033100025_c.pdf',
  },
  'exail-technologies': {
    amount: 478_545_000, currency: 'EUR', yearEnd: '2025-12-31',
    sourceTitle: '2025 consolidated income statement, PDF p. 84',
    sourceUrl: 'https://www.exail-technologies.com/wp-content/uploads/2026/04/exail-technologies-urd-2025en.pdf',
  },
  'excelland-robotics': {
    amount: 317_707_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 310',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0831/2026083100009.pdf#page=310',
  },
  'exyn-technologies': {
    amount: 5_810_504, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form S-1, annual audited statements of operations',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1960355/000110465926078960/exyn-20260331xs1.htm',
  },
  'fanuc': {
    amount: 857_831_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Consolidated annual results',
    sourceUrl: 'https://www.fanuc.co.jp/en/ir/announce/pdf/2026/financialresult202603_e.pdf',
  },
  'fbr': {
    amount: 551_558, currency: 'AUD', yearEnd: '2026-06-30',
    sourceTitle: '2026 annual report, consolidated revenue, note 7, PDF p. 63',
    sourceUrl: 'https://announcements.asx.com.au/asxpdf/20260930/pdf/074s95418zyt8v.pdf',
  },
  'galaxis-technology': {
    amount: 908_699_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 75',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0427/2026042703312.pdf#page=75',
  },
  'geek-plus': {
    amount: 3_171_013_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 93',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0423/2026042303218.pdf#page=93',
  },
  'globus-medical': {
    amount: 2_938_931_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-24',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1237831/000162828026011209/gmed-20251231.htm',
  },
  'guardforce-ai': {
    amount: 35_232_701, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, filed 2026-04-21',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1804469/000121390026046137/ea0284325-20f_guardforce.htm',
  },
  'harmonic-drive-systems': {
    amount: 59_557_877_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'FY2026 consolidated results, consolidated income statement',
    sourceUrl: 'https://www2.jpx.co.jp/disc/63240/140120260511521357.pdf#page=12',
  },
  'hesai-group': {
    amount: 3_027_573_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, filed 2026-04-24',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1861737/000110465926048025/hsai-20251231x20f.htm',
  },
  'hexagon': {
    amount: 5_424_600_000, currency: 'EUR', yearEnd: '2025-12-31',
    sourceTitle: '2025 consolidated income statement, PDF p. 177',
    sourceUrl: 'https://api.alertir.com/files/press/hexagon/202603207919-1.pdf',
  },
  'hiwin-technologies': {
    amount: 24_262_638_000, currency: 'TWD', yearEnd: '2025-12-31',
    sourceTitle: 'FY2025 audited consolidated statements of comprehensive income',
    sourceUrl: 'https://www.hiwin.tw/uploadfiles/file/finance_report/202504_2049_A02_en.pdf#page=8',
  },
  'horizon-robotics': {
    amount: 3_758_268_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 140',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0430/2026043001830.pdf#page=140',
  },
  'huayan-robotics': {
    amount: 386_867_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 103',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0427/2026042703294.pdf#page=103',
  },
  'husqvarna': {
    amount: 46_613_000_000, currency: 'SEK', yearEnd: '2025-12-31',
    sourceTitle: '2025 consolidated income statement, PDF p. 84',
    sourceUrl: 'https://www.husqvarnagroup.com/sites/husqvarna/files/pr/202603249629-1.pdf#page=84',
  },
  'hyundai-motor': {
    amount: 186_254_472_000_000, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'FY2025 audited consolidated statements of income',
    sourceUrl: 'https://www.hyundai.com/content/dam/hyundai/ww/en/images/company/investor-relations/financial-Information/report-en/2025/2025-q4-consolidated-audit-report-en.pdf#page=10',
  },
  'ideaforge-technology': {
    amount: 2_261_290_000, currency: 'INR', yearEnd: '2026-03-31',
    sourceTitle: 'Consolidated statement of profit and loss, note 24, PDF p. 241',
    sourceUrl: 'https://ideaforgetech.com/uploads/Other/SE_AnnualReportupload_2025-26.pdf#page=241',
  },
  'intuitive-surgical': {
    amount: 10_064_700_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-03',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1035267/000103526726000010/isrg-20251231.htm',
  },
  'johnson-and-johnson': {
    amount: 94_193_000_000, currency: 'USD', yearEnd: '2025-12-28',
    sourceTitle: 'Form 10-K, filed 2026-02-11',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/200406/000020040626000016/jnj-20251228.htm',
  },
  'jungheinrich': {
    amount: 5_502_000_000, currency: 'EUR', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue',
    sourceUrl: 'https://www.jungheinrich.com/en/investor-relations/annual-report-2025',
  },
  'kaierda-welding-robot': {
    amount: 649_729_308.51, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue, PDF p. 9',
    sourceUrl: 'http://dataclouds.cninfo.com.cn/shgonggao/hsomarket/2026/20260422/11e6f5b349574450bf9ee2bbf1f1c73d.PDF',
  },
  'kardex': {
    amount: 850_400_000, currency: 'EUR', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual financial results, group net revenues',
    sourceUrl: 'https://www.eqs-news.com/news/ad-hoc/kardex-holding-ag-financial-results-2025/4cf92263-b51e-48de-87fc-3ebaabfdde7c_en',
  },
  'kawasaki-heavy-industries': {
    amount: 2_311_267_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Consolidated financial statements, p. 8',
    sourceUrl: 'https://global.kawasaki.com/en/corp/ir/library/pdf/etc_260619-1e.pdf',
  },
  'kion-group': {
    amount: 11_297_200_000, currency: 'EUR', yearEnd: '2025-12-31',
    sourceTitle: 'Consolidated income statement',
    sourceUrl: 'https://reports.kiongroup.com/2025/ar/financial-statements/income-statement.html',
  },
  'knightscope': {
    amount: 11_335_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-27',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1600983/000110465926036240/kscp-20251231x10k.htm',
  },
  'kodiak-ai': {
    amount: 3_797_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-11',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1853138/000162828026016910/kdk-20251231.htm',
  },
  'kraken-robotics': {
    amount: 102_210_000, currency: 'CAD', yearEnd: '2025-12-31',
    sourceTitle: 'Annual management discussion, selected annual financial information',
    sourceUrl: 'https://www.krakenrobotics.com/wp-content/uploads/2026/04/Kraken-MDA-Q4-2025-FINAL.pdf',
  },
  'kratos-defense': {
    amount: 1_346_800_000, currency: 'USD', yearEnd: '2025-12-28',
    sourceTitle: 'Form 10-K, filed 2026-02-23',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1069258/000106925826000013/ktos-20251228.htm',
  },
  'laifual-drive': {
    amount: 260_867_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 301',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0622/2026062200047.pdf#page=301',
  },
  'ldrobot': {
    amount: 747_773_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 294',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0430/2026043000099.pdf#page=294',
  },
  'leaderdrive': {
    amount: 570_714_025.26, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue, PDF p. 6',
    sourceUrl: 'https://static.cninfo.com.cn/finalpage/2026-04-23/1225149955.PDF',
  },
  'lg-electronics': {
    amount: 89_200_882_000_000, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Amended annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/07/06/000542/20260706001249/11011.htm#toc_20',
  },
  'lifeward': {
    amount: 22_034_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-18',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1607962/000117891326001208/zk2634619.htm',
  },
  'maytronics': {
    amount: 1_405_646_000, currency: 'ILS', yearEnd: '2025-12-31',
    sourceTitle: '2025 consolidated income statement, PDF p. 109',
    sourceUrl: 'https://brand.maytronics.com/asset/a6e748f3-5756-4108-9775-5f7401c1dc37/2025-Annual-Report-HEB.pdf',
  },
  'mech-mind-robotics': {
    amount: 388_771_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 331',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0824/2026082400017.pdf#page=331',
  },
  'medtronic': {
    amount: 36_364_000_000, currency: 'USD', yearEnd: '2026-04-24',
    sourceTitle: 'Form 10-K, filed 2026-06-18',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1613103/000162828026044354/mdt-20260424.htm',
  },
  'microbot-medical': {
    amount: 0, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, annual financial statements and revenue recognition',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/883975/000149315226012935/form10-k.htm',
  },
  'microport-medbot': {
    amount: 551_069_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 175',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0430/2026043000980.pdf#page=175',
  },
  'midea-group': {
    amount: 458_502_000_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'Annual results announcement',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0330/2026033001928.pdf',
  },
  'mitsubishi-electric': {
    amount: 5_894_747_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Fiscal 2026 consolidated statement of profit or loss, PDF p. 5',
    sourceUrl: 'https://www.mitsubishielectric.com/en/pr/2026/pdf/0428_co1.pdf#page=5',
  },
  'mobileye': {
    amount: 1_894_000_000, currency: 'USD', yearEnd: '2025-12-27',
    sourceTitle: 'Form 10-K, filed 2026-02-12',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1910139/000110465926014300/mbly-20251227x10k.htm',
  },
  'momenta': {
    amount: 2_412_523_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 333',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0629/2026062900057.pdf#page=333',
  },
  'myomo': {
    amount: 40_928_042, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-09',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1369290/000119312526098531/myo-20251231.htm',
  },
  'nabtesco': {
    amount: 307_912_000_000, currency: 'JPY', yearEnd: '2025-12-31',
    sourceTitle: 'Consolidated annual results',
    sourceUrl: 'https://www.nabtesco.com/cms/wp-content/uploads/Summary_of_Consolidated_Financial_Statements_for_FY2025_e.pdf',
  },
  'nachi-fujikoshi': {
    amount: 235_903_000_000, currency: 'JPY', yearEnd: '2025-11-30',
    sourceTitle: '2025 consolidated statement of income, PDF p. 6',
    sourceUrl: 'https://www.nachi-fujikoshi.co.jp/dcms_media/other/IR20260114_1en.pdf',
  },
  'nauticus-robotics': {
    amount: 5_274_915, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-04-15',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1849820/000184982026000051/kitt-20251231.htm',
  },
  'neuromeka': {
    amount: 18_954_203_205, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/19/001294/20260319005316/11011.htm#toc_19',
  },
  'nvidia': {
    amount: 215_938_000_000, currency: 'USD', yearEnd: '2026-01-25',
    sourceTitle: 'Form 10-K, filed 2026-02-25',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm',
  },
  'ocado-group': {
    amount: 1_381_700_000, currency: 'GBP', yearEnd: '2025-11-30',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://data.fca.org.uk/artefacts/NSM/DirectUpload/NI-000140192/NI-000140192.pdf',
    scope: 'Continuing operations',
  },
  'omron': {
    amount: 767_351_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Fiscal 2026 consolidated results, net sales from continuing operations',
    sourceUrl: 'https://www.omron.com/global/en/assets/file/ir/irlib/20260513_financial_results.pdf',
    scope: 'Continuing operations',
  },
  'ondas-holdings': {
    amount: 50_731_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-30',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1646188/000121390026035981/ea0282911-10k_ondas.htm',
  },
  'onerobotics': {
    amount: 900_560_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 114',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0429/2026042904444.pdf#page=114',
  },
  'orbbec': {
    amount: 940_743_637.65, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue, PDF p. 9',
    sourceUrl: 'https://static.cninfo.com.cn/finalpage/2026-04-20/1225123796.PDF',
  },
  'ouster': {
    amount: 169_384_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-02',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1816581/000162828026013313/oust-20251231.htm',
  },
  'palladyne-ai': {
    amount: 5_246_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-05',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1826681/000119312526092443/pdyn-20251231.htm',
  },
  'parrot': {
    amount: 79_776_000, currency: 'EUR', yearEnd: '2025-12-31',
    sourceTitle: '2025 consolidated income statement, PDF p. 7',
    sourceUrl: 'https://www.parrot.com/assets/s3fs-public/media-public/2026/AG%203%20juin%202026/Parrot_-_2025.12.31_-_RCC.pdf#page=7',
  },
  'pony-ai': {
    amount: 90_001_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, filed 2026-04-22',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1969302/000110465926046406/pony-20251231x20f.htm',
  },
  'procept-biorobotics': {
    amount: 308_054_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-26',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1588978/000158897826000009/prct-20251231.htm',
  },
  'rainbow-robotics': {
    amount: 34_123_110_054, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/20/001000/20260320003808/11011.htm#toc_19',
  },
  'red-cat-holdings': {
    amount: 40_729_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-19',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/748268/000162828026019861/rcat-20251231.htm',
  },
  'richtech-robotics': {
    amount: 5_045_000, currency: 'USD', yearEnd: '2025-09-30',
    sourceTitle: 'Form 10-K, filed 2026-01-20',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1963685/000121390026005343/ea0272362-10k_richtech.htm',
  },
  'roborock': {
    amount: 18_694_776_828, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report summary, group revenue, PDF p. 11',
    sourceUrl: 'http://static.cninfo.com.cn/finalpage/2026-04-23/1225147553.PDF',
  },
  'robosense': {
    amount: 1_941_008_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 85',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0424/2026042400954.pdf#page=85',
  },
  'robostar': {
    amount: 75_735_139_041, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/12/001216/20260312003020/11011.htm#toc_19',
  },
  'robotis': {
    amount: 38_942_547_006, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Amended annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/07/08/000715/20260708001717/11011.htm#toc_20',
  },
  'robotphoenix': {
    amount: 387_359_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 299',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0508/2026050800015.pdf#page=299',
  },
  'rockwell-automation': {
    amount: 8_989_000_000, currency: 'USD', yearEnd: '2026-09-30',
    sourceTitle: 'Form 10-K, filed 2026-11-12',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1024478/000102447826000048/rok-20260930.htm',
  },
  'rokae-robotics': {
    amount: 521_747_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 309',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0630/2026063000033.pdf#page=309',
  },
  'samsung-electronics': {
    amount: 333_605_938_000_000, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'FY2025 consolidated statement of profit or loss',
    sourceUrl: 'https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2025_con_quarter04_soi.pdf#page=1',
  },
  'scott-technology': {
    amount: 294_116_000, currency: 'NZD', yearEnd: '2026-08-31',
    sourceTitle: '2026 consolidated statement of comprehensive income, PDF p. 38',
    sourceUrl: 'https://scottautomation.com/assets/Investor-centre/Announcements/2026/Scott-Annual-Report-2026.pdf#page=38',
  },
  'seer-robotics': {
    amount: 441_877_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 305',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0615/2026061500013.pdf#page=305',
  },
  'seiko-epson': {
    amount: 1_413_251_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Fiscal 2025 consolidated statement of comprehensive income, PDF p. 9',
    sourceUrl: 'https://www2.jpx.co.jp/disc/67240/140120260429514136.pdf#page=9',
  },
  'serve-robotics': {
    amount: 2_651_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-12',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1832483/000183248326000010/patr-20251231.htm',
  },
  'shenzhen-inovance': {
    amount: 45_104_844_200.13, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report summary, group revenue, PDF p. 7',
    sourceUrl: 'https://static.cninfo.com.cn/finalpage/2026-04-28/1225208487.PDF',
  },
  'siasun-robot-and-automation': {
    amount: 4_121_805_440.05, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report summary, group revenue, PDF p. 6',
    sourceUrl: 'https://static.cninfo.com.cn/finalpage/2026-04-24/1225170931.PDF',
  },
  'smith-and-nephew': {
    amount: 6_164_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, annual group revenue',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/845982/000110465926028258/snn-20251231x20f.htm',
  },
  'softbank-group': {
    amount: 7_798_650_000_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'Fiscal 2025 consolidated statement of income, PDF p. 49',
    sourceUrl: 'https://group.softbank/media/Project/sbg/sbg/pdf/ir/financials/financial_reports/financial-report_q4fy2025_01_en.pdf#page=49',
  },
  'spg': {
    amount: 341_670_161_923, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/18/000401/20260318002063/11011.htm#toc_19',
  },
  'ss-innovations-international': {
    amount: 42_484_747, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-10',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1676163/000121390026025440/ea0277925-10k_ssinnova.htm',
  },
  'stereotaxis': {
    amount: 32_377_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-12',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1289340/000149315226009881/form10-k.htm',
  },
  'stryker': {
    amount: 25_116_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-11',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/310764/000031076426000010/syk-20251231.htm',
  },
  'swarmer': {
    amount: 309_920, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, annual consolidated statements of operations',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/2092574/000110465926029590/tm2529424-12_424b4.htm',
  },
  'symbotic': {
    amount: 2_246_922_000, currency: 'USD', yearEnd: '2025-09-27',
    sourceTitle: 'Form 10-K, filed 2025-11-24',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm',
  },
  't-robotics': {
    amount: 43_812_661_900, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, consolidated income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/19/001956/20260319008141/11011.htm#toc_19',
  },
  'techman-robot': {
    amount: 1_822_095_000, currency: 'TWD', yearEnd: '2025-12-31',
    sourceTitle: 'FY2025 consolidated financial report, statement of comprehensive income',
    sourceUrl: 'https://mopsov.twse.com.tw/server-java/t164sb01?step=1&CO_ID=4585&SYEAR=2025&SSEASON=4&REPORT_ID=C',
  },
  'teradyne': {
    amount: 3_190_024_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-19',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/97210/000119312526059002/ter-20251231.htm',
  },
  'tesla': {
    amount: 94_827_000_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-01-29',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm',
  },
  'tinavi-medical': {
    amount: 278_818_948.34, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue, PDF p. 7',
    sourceUrl: 'http://static.cninfo.com.cn/finalpage/2026-04-29/1225249364.PDF',
  },
  'topstar-technology': {
    amount: 2_510_080_513.47, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 consolidated income statement, p. 15',
    sourceUrl: 'https://disc.static.szse.cn/download/disc/disk03/finalpage/2026-03-31/b7a7acbf-90ff-431c-8216-bb4692ec739c.PDF',
  },
  'ubtech-robotics': {
    amount: 2_000_999_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 185',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0414/2026041401168.pdf#page=185',
  },
  'uisee-technologies': {
    amount: 328_257_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'IPO prospectus, historical group revenue, PDF p. 328',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0512/2026051200147.pdf#page=328',
  },
  'unitree-robotics': {
    amount: 1_699_269_300, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'Final prospectus, 14 Aug 2026, p. 1-1-35',
    sourceUrl: 'https://file.finance.sina.com.cn/211.154.219.97:9494/MRGG/CNSESH_STOCK/2026/2026-8/2026-08-14/12492967.PDF',
  },
  'unusual-machines': {
    amount: 11_199_217, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-03-12',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1956955/000168316826001730/umac_i10k-123125.htm',
  },
  'weride': {
    amount: 684_587_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, filed 2026-04-23',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1867729/000110465926047323/wrd-20251231x20f.htm',
  },
  'xiaomi': {
    amount: 457_286_687_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 270',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042800526.pdf#page=270',
  },
  'xpeng': {
    amount: 76_719_742_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: 'Form 20-F, filed 2026-04-16',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1810997/000119312526157849/d36361d20f.htm',
  },
  'xtend-ai-robotics': {
    amount: 19_714_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Merger prospectus, Xtend Reality Expansion consolidated statements',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/2111860/000119312526344724/d121457d424b3.htm',
    scope: 'Operating predecessor',
  },
  'yamaha-motor': {
    amount: 2_534_203_000_000, currency: 'JPY', yearEnd: '2025-12-31',
    sourceTitle: 'Consolidated annual results',
    sourceUrl: 'https://global.yamaha-motor.com/ir/library/report/pdf/2025/2025report-e.pdf',
  },
  'yaskawa-electric': {
    amount: 542_100_000_000, currency: 'JPY', yearEnd: '2026-02-28',
    sourceTitle: 'FY2025 financial results briefing',
    sourceUrl: 'https://www.yaskawa-global.com/wp-content/uploads/2026/04/254Q_script_E.pdf',
  },
  'yijiahe-technology': {
    amount: 550_587_437.09, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, group revenue, PDF p. 8',
    sourceUrl: 'https://static.cninfo.com.cn/finalpage/2026-04-29/1225237896.PDF',
  },
  'yuil-robotics': {
    amount: 36_917_751_388, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, issuer income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/18/001249/20260318005797/11011.htm#toc_21',
  },
  'yujin-robot': {
    amount: 28_189_374_133, currency: 'KRW', yearEnd: '2025-12-31',
    sourceTitle: 'Annual report, issuer income statement',
    sourceUrl: 'https://kind.krx.co.kr/external/2026/03/19/001464/20260319006036/11011.htm#toc_21',
  },
  'yunji-technology': {
    amount: 301_242_000, currency: 'CNY', yearEnd: '2025-12-31',
    sourceTitle: '2025 annual report, consolidated income statement, PDF p. 156',
    sourceUrl: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0429/2026042906272.pdf#page=156',
  },
  'yushin': {
    amount: 23_101_373_000, currency: 'JPY', yearEnd: '2026-03-31',
    sourceTitle: 'FY2026 consolidated results, consolidated income statement',
    sourceUrl: 'https://www2.jpx.co.jp/disc/64820/140120260514533890.pdf#page=8',
  },
  'zimmer-biomet': {
    amount: 8_231_500_000, currency: 'USD', yearEnd: '2025-12-31',
    sourceTitle: 'Form 10-K, filed 2026-02-20',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1136869/000119312526059853/zbh-20251231.htm',
  },
};
