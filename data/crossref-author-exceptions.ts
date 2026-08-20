/**
 * Documented exceptions for the Crossref author sweep
 * (npm run check:crossref-authors), in the house pattern of
 * data/link-check-exceptions.ts: every entry names what it masks, why the
 * registry entry is right anyway, and how and when a human verified that
 * against a primary source. Anything not listed here fails the sweep.
 *
 * The registry author-field policy (data/citations.ts header) allows a
 * full given name where Crossref publishes only an initial ONLY when a
 * fuller transcription of the record corroborates it; this file is where
 * that evidence is recorded. Where no corroboration exists, the registry
 * keeps the initial instead of registering an exception.
 */
export interface CrossrefAuthorExceptionEntry {
  /** Registry citation id the exception applies to. */
  id: string;
  /** Which check to skip: every author divergence for the id, only the
   *  unverifiable-expansion class (optionally for one author position), the
   *  year check, or the title check. */
  skip: 'author' | 'author-expansion' | 'year' | 'title';
  /** 1-based author position, for author-expansion entries. */
  authorIndex?: number;
  /** Why the registry entry is correct despite the divergence. */
  reason: string;
  /** How and when a human verified the claim (source + date). */
  verified: string;
}

export const CROSSREF_AUTHOR_EXCEPTIONS: CrossrefAuthorExceptionEntry[] = [
  {
    id: 'raibert-craig-1981',
    skip: 'author-expansion',
    reason:
      'Full names "Marc H. Raibert" and "John Craig" corroborated where Crossref prints only initials "M. H." / "J. J.".',
    verified: 'OpenAlex authorships for doi:10.1115/1.3139652 read 2026-08-20.',
  },
  {
    id: 'pratt-williamson-1995',
    skip: 'author-expansion',
    reason:
      'Full names "Gill A. Pratt" and "Matthew M. Williamson" corroborated where Crossref prints only "G.A." / "M.M.".',
    verified: 'OpenAlex authorships for doi:10.1109/IROS.1995.525827 read 2026-08-20.',
  },
  {
    id: 'mishra-1987',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Brajendra" (Crossref initial "B.") corroborated by OpenAlex\u2019s transcription of the Springer byline; authors 2-3 keep printed initials in the registry.',
    verified: 'OpenAlex authorships for doi:10.1007/BF01840373 read 2026-08-20.',
  },
  {
    id: 'mishra-1987',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"Jacob T." corroborated (Crossref "J. T.", OpenAlex "Jacob T. Schwartz").',
    verified: 'OpenAlex authorships for doi:10.1007/BF01840373 read 2026-08-20.',
  },
  {
    id: 'kavraki-1996',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Lydia E." corroborated (Crossref "L.E.", OpenAlex "Lydia E. Kavraki"); authors 2-4 keep printed initials in the registry.',
    verified: 'OpenAlex authorships for doi:10.1109/70.508439 read 2026-08-20.',
  },
  {
    id: 'mayne-2000',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"James B." corroborated (Crossref "J.B.", OpenAlex "James B. Rawlings").',
    verified: 'OpenAlex authorships for doi:10.1016/S0005-1098(99)00214-9 read 2026-08-20.',
  },
  {
    id: 'mayne-2000',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Christopher V." corroborated (Crossref "C.V.", OpenAlex "Christopher V. Rao").',
    verified: 'OpenAlex authorships for doi:10.1016/S0005-1098(99)00214-9 read 2026-08-20.',
  },
  {
    id: 'kschischang-2001',
    skip: 'author-expansion',
    reason:
      'Full names "Frank R. Kschischang", "Brendan J. Frey", "Hans-Andrea Loeliger" corroborated where Crossref prints only "F.R." / "B.J." / "H.-A.".',
    verified: 'OpenAlex authorships for doi:10.1109/18.910572 read 2026-08-20.',
  },
  {
    id: 'ferrari-canny-1992',
    skip: 'author-expansion',
    reason:
      '"Carlo" corroborated (Crossref "C.", OpenAlex "Carlo Ferrari"). Author 2 keeps the printed initial "J." in the registry.',
    verified: 'OpenAlex authorships for doi:10.1109/ROBOT.1992.219918 read 2026-08-20.',
  },
  {
    id: 'ferrari-canny-1992',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"John" corroborated (Crossref "J.", OpenAlex "John Canny").',
    verified: 'OpenAlex authorships for doi:10.1109/ROBOT.1992.219918 read 2026-08-20.',
  },
  {
    id: 'bicchi-kumar-2000',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Antonio" corroborated (Crossref "A.", OpenAlex "Antonio Bicchi"). Author 2 keeps the printed initial "V." in the registry.',
    verified: 'OpenAlex authorships for doi:10.1109/ROBOT.2000.844081 read 2026-08-20.',
  },
  {
    id: 'khatib-1987',
    skip: 'author-expansion',
    reason:
      '"Oussama" corroborated where Crossref prints only "O.".',
    verified: 'OpenAlex authorships for doi:10.1109/JRA.1987.1087068 read 2026-08-20.',
  },
  {
    id: 'kaess-2008',
    skip: 'author-expansion',
    reason:
      'Full names "Michael Kaess", "Ananth Ranganathan", "Frank Dellaert" corroborated where Crossref prints only "M." / "A." / "F.".',
    verified: 'OpenAlex authorships for doi:10.1109/TRO.2008.2006706 read 2026-08-20.',
  },
  {
    id: 'mishra-1987',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Micha" corroborated (Crossref "M.", OpenAlex "Micha Sharir").',
    verified: 'OpenAlex authorships for doi:10.1007/BF01840373 read 2026-08-20.',
  },
  {
    id: 'cutkosky-1989',
    skip: 'author-expansion',
    reason:
      '"Mark R." corroborated (Crossref "M.R.", OpenAlex "Mark R. Cutkosky").',
    verified: 'OpenAlex authorships for doi:10.1109/70.34763 read 2026-08-20.',
  },
  {
    id: 'albu-schaffer-2003',
    skip: 'author-expansion',
    reason:
      '"Christian", "Alin", "Andreas" corroborated (Crossref initials "C."/"A."/"A.", OpenAlex full names "Christian Ott", "Alin Albu-Schäffer", "Andreas Kugi"). Author 4 keeps the printed initial "G." in the registry.',
    verified: 'OpenAlex authorships for doi:10.1109/ROBOT.2003.1242067 read 2026-08-20.',
  },
  {
    id: 'di-carlo-2018',
    skip: 'author',
    reason:
      'Registry "Jared Di Carlo" vs Crossref family "Di Carlo": same name; the registry string stores the multi-word family unsplit, which the primary-name comparison accepts.',
    verified: 'Crossref record 10.1109/IROS.2018.8594448 and OpenAlex authorships read 2026-08-20.',
  },
  {
    id: 'mason-1981',
    skip: 'author',
    reason:
      'Registry "Matthew Mason" vs Crossref "Matthew T. Mason": same person and primary name; missing middle initial only.',
    verified: 'Crossref record 10.1109/TSMC.1981.4308708 read 2026-08-20.',
  },
  {
    id: 'smith-1990',
    skip: 'author',
    reason:
      'Registry "Randall C. Smith" vs Crossref "Randall Smith" (book-chapter record omits the middle initial): same person, primary names identical.',
    verified: 'Crossref record 10.1007/978-1-4613-8997-2_14 read 2026-08-20.',
  },
  {
    id: 'whitney-1969',
    skip: 'author',
    reason:
      'Registry "Daniel E. Whitney" vs Crossref "Daniel Whitney" for the 1969 TMMS record; other Crossref Whitney records print "Daniel E.".',
    verified: 'Crossref record 10.1109/TMMS.1969.299896 and OpenAlex authorships read 2026-08-20.',
  },
  {
    id: 'wampler-1986',
    skip: 'author',
    reason:
      'Registry "Charles W. Wampler" vs Crossref "Charles Wampler": same person and primary name; Crossref middle-initial inconsistency.',
    verified: 'Crossref record 10.1109/TSMC.1986.289285 and OpenAlex authorships read 2026-08-20.',
  },
  {
    id: 'qin-badgwell-2003',
    skip: 'author',
    reason:
      'Registry "S. Joe Qin" vs Crossref "S.Joe Qin" is a spacing artifact of the Crossref record, not a name divergence.',
    verified: 'Crossref record 10.1016/S0967-0661(02)00186-7 read 2026-08-20.',
  },
  {
    id: 'markenscoff-1990',
    skip: 'author',
    authorIndex: 2,
    reason:
      'Registry "Luqun Ni" vs Crossref "Luqun Ni": same name; Crossref stores the whole name in the family field, which the primary-name comparison accepts.',
    verified: 'Crossref record 10.1177/027836499000900102 read 2026-08-20.',
  },
  {
    id: 'ziegler-nichols-1942',
    skip: 'year',
    reason:
      'The DOI resolves to ASME\u2019s 1993 republication of the 1942 classic; the registry cites the original year the record itself names.',
    verified: 'Crossref record 10.1115/1.2899060 read 2026-08-20 (title names the 1942 controller-settings paper; container dated 1993).',
  },
  {
    id: 'kalman-1960',
    skip: 'author',
    reason:
      'The DOI is a Wiley book-chapter republication, so Crossref carries no personal authors for the original byline. The registry cites the original 1960 paper and its original author.',
    verified: 'Crossref record 10.1109/9780470544334.ch8 read 2026-08-20.',
  },
  {
    id: 'kalman-1960',
    skip: 'year',
    reason: 'Same republication situation: 1960 original, 2009 Wiley container.',
    verified: 'Crossref record 10.1109/9780470544334.ch8 read 2026-08-20.',
  },
];
