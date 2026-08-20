/**
 * Documented exceptions for the Crossref author sweep
 * (npm run check:crossref-authors), in the house pattern of
 * data/link-check-exceptions.ts: every entry names what it masks, why the
 * registry entry is right anyway, and how and when a human verified that
 * against a primary source. Anything not listed here fails the sweep.
 *
 * SCOPING RULE (binding since 2026-08-20): an author-scoped entry (skip
 * 'author' or 'author-expansion') must name the 1-based authorIndex of the
 * ONE position it covers, and the sweep rejects the whole file otherwise.
 * The earlier version treated a missing authorIndex as a wildcard that
 * muted its class for every author position on the id, which is how a
 * planted "Gustav Hirzinger" at an unprotected position of
 * albu-schaffer-2003 survived a green run. Position-less author
 * divergences (an author-count mismatch, or a DOI whose Crossref record
 * carries no personal authors) use their own skip values, 'author-count'
 * and 'no-authors', which take no authorIndex.
 *
 * EVIDENCE RULE (binding since 2026-08-20): an aggregator's display name
 * is a guess about identity, NOT corroboration. OpenAlex's display_name is
 * a cluster-level label it computed, not a transcription of the byline,
 * and it mis-clustered doi:10.1007/BF01840373 onto a different Mishra
 * ("Brajendra", a Worcester Polytechnic materials scientist) while
 * attaching a stranger's ORCID to the record. Only a record that
 * genuinely transcribes or states the byline counts as verification: the
 * publisher's landing page or PDF byline, a DBLP publication record, or
 * the ORCID profile of the CORRECT person with this work actually listed
 * (check affiliation and subject area before trusting an ORCID; a real
 * ORCID can belong to a different human than the byline). OpenAlex's
 * raw_author_name DOES transcribe the byline, so it is admissible where
 * it prints a full name; for every record in this file it prints the same
 * initial Crossref does, which is why the 16 OpenAlex display_name
 * exceptions registered 2026-08-20 were re-verified against DBLP (15
 * positions) or dropped back to the printed initial (raibert-craig-1981:
 * the ASME landing page itself prints only "M. H. Raibert" and
 * "J. J. Craig", and DBLP does not index JDSMC).
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
  /** Which check to skip: a divergence at exactly ONE author position
   *  ('author' or 'author-expansion', both of which REQUIRE authorIndex),
   *  a position-less author-shape divergence ('author-count' or
   *  'no-authors', no authorIndex), or the year/title checks. A blanket
   *  author-scoped entry is rejected by the sweep, not treated as a
   *  wildcard. */
  skip: 'author' | 'author-expansion' | 'author-count' | 'no-authors' | 'year' | 'title';
  /** REQUIRED for 'author'/'author-expansion': the 1-based author
   *  position this entry covers, and nothing else. Must be absent for
   *  every other skip value. */
  authorIndex?: number;
  /** Why the registry entry is correct despite the divergence. */
  reason: string;
  /** How and when a human verified the claim: a source that transcribes
   *  or states the byline (DBLP record, publisher landing page, PDF
   *  byline, the correct person's ORCID with the work listed) plus the
   *  date. An aggregator's display name is not evidence. */
  verified: string;
}

export const CROSSREF_AUTHOR_EXCEPTIONS: CrossrefAuthorExceptionEntry[] = [
  // raibert-craig-1981 deliberately has NO entries: the 2026-08-20
  // OpenAlex display_name expansions ("Marc Raibert", "John Craig") were
  // dropped because no record transcribes a fuller byline, and the
  // registry now keeps the printed initials "M. H. Raibert" / "J. J.
  // Craig".
  {
    id: 'pratt-williamson-1995',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Gill" expands Crossref initial "G.A."; DBLP\u2019s publication record for the DOI transcribes the byline "Gill A. Pratt".',
    verified:
      'DBLP publication record for doi:10.1109/IROS.1995.525827 (conf/iros/PrattW95: Gill A. Pratt, Matthew M. Williamson) read 2026-08-20.',
  },
  {
    id: 'pratt-williamson-1995',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"Matthew" expands Crossref initial "M.M."; DBLP\u2019s record transcribes "Matthew M. Williamson".',
    verified:
      'DBLP publication record for doi:10.1109/IROS.1995.525827 (conf/iros/PrattW95) read 2026-08-20.',
  },
  {
    id: 'mishra-1987',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Bhubaneswar" expands Crossref initial "B."; DBLP lists the paper under Bhubaneswar Mishra (pid m/BhubaneswarMishra, New York University), with Courant co-authors Schwartz and Sharir corroborating the identity. OpenAlex\u2019s display_name "Brajendra Mishra" is a mis-cluster onto ORCID 0000-0001-7897-1817 (a Worcester Polytechnic materials scientist); OpenAlex\u2019s own raw_author_name prints only "B. Mishra". Do not "correct" this back from OpenAlex.',
    verified:
      'DBLP publication record for doi:10.1007/BF01840373 (journals/algorithmica/MishraSS87: Bhubaneswar Mishra, Jacob T. Schwartz, Micha Sharir) read 2026-08-20.',
  },
  {
    id: 'mishra-1987',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"Jacob T." matches the DBLP byline "Jacob T. Schwartz" where Crossref prints "J. T.".',
    verified:
      'DBLP publication record for doi:10.1007/BF01840373 (journals/algorithmica/MishraSS87) read 2026-08-20.',
  },
  {
    id: 'mishra-1987',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Micha" matches the DBLP byline "Micha Sharir" where Crossref prints "M.".',
    verified:
      'DBLP publication record for doi:10.1007/BF01840373 (journals/algorithmica/MishraSS87) read 2026-08-20.',
  },
  {
    id: 'kavraki-1996',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Lydia E." matches the DBLP byline "Lydia E. Kavraki" where Crossref prints "L.E."; authors 2-4 keep printed initials in the registry.',
    verified:
      'DBLP publication record for doi:10.1109/70.508439 (journals/trob/KavrakiSLO96: Lydia E. Kavraki, Petr Svestka, Jean-Claude Latombe, Mark H. Overmars) read 2026-08-20.',
  },
  {
    id: 'mayne-2000',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"James B." matches the DBLP byline "James B. Rawlings" where Crossref prints "J.B."; authors 1 and 4 keep printed initials in the registry.',
    verified:
      'DBLP publication record for doi:10.1016/S0005-1098(99)00214-9 (journals/automatica/MayneRRS00: David Q. Mayne, James B. Rawlings, Christopher V. Rao, Pierre O. M. Scokaert) read 2026-08-20.',
  },
  {
    id: 'mayne-2000',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Christopher V." matches the DBLP byline "Christopher V. Rao" where Crossref prints "C.V.".',
    verified:
      'DBLP publication record for doi:10.1016/S0005-1098(99)00214-9 (journals/automatica/MayneRRS00) read 2026-08-20.',
  },
  {
    id: 'kschischang-2001',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Frank R." matches the DBLP byline "Frank R. Kschischang" where Crossref prints "F.R.".',
    verified:
      'DBLP publication record for doi:10.1109/18.910572 (journals/tit/KschischangFL01: Frank R. Kschischang, Brendan J. Frey, Hans-Andrea Loeliger) read 2026-08-20.',
  },
  {
    id: 'kschischang-2001',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"Brendan J." matches the DBLP byline "Brendan J. Frey" where Crossref prints "B.J.".',
    verified:
      'DBLP publication record for doi:10.1109/18.910572 (journals/tit/KschischangFL01) read 2026-08-20.',
  },
  {
    id: 'kschischang-2001',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Hans-Andrea" matches the DBLP byline "Hans-Andrea Loeliger" where Crossref prints "H.-A.".',
    verified:
      'DBLP publication record for doi:10.1109/18.910572 (journals/tit/KschischangFL01) read 2026-08-20.',
  },
  {
    id: 'ferrari-canny-1992',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Carlo" matches the DBLP byline "Carlo Ferrari" where Crossref prints "C.".',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.1992.219918 (Carlo Ferrari, John F. Canny; ICRA 1992) read 2026-08-20.',
  },
  {
    id: 'ferrari-canny-1992',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"John F." matches the DBLP byline "John F. Canny" where Crossref prints "J.".',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.1992.219918 (Carlo Ferrari, John F. Canny; ICRA 1992) read 2026-08-20.',
  },
  {
    id: 'bicchi-kumar-2000',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Antonio" matches the DBLP byline "Antonio Bicchi" where Crossref prints "A."; author 2 keeps the printed initial "V." in the registry.',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.2000.844081 (conf/icra/BicchiK00: Antonio Bicchi, Vijay Kumar) read 2026-08-20.',
  },
  {
    id: 'khatib-1987',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Oussama" matches the DBLP byline "Oussama Khatib" where Crossref prints "O.".',
    verified:
      'DBLP publication record for doi:10.1109/JRA.1987.1087068 (Oussama Khatib; IEEE J. Robotics Autom.) read 2026-08-20.',
  },
  {
    id: 'kaess-2008',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Michael" matches the DBLP byline "Michael Kaess" where Crossref prints "M.".',
    verified:
      'DBLP publication record for doi:10.1109/TRO.2008.2006706 (journals/trob/KaessRD08: Michael Kaess, Ananth Ranganathan, Frank Dellaert) read 2026-08-20.',
  },
  {
    id: 'kaess-2008',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"Ananth" matches the DBLP byline "Ananth Ranganathan" where Crossref prints "A.".',
    verified:
      'DBLP publication record for doi:10.1109/TRO.2008.2006706 (journals/trob/KaessRD08) read 2026-08-20.',
  },
  {
    id: 'kaess-2008',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Frank" matches the DBLP byline "Frank Dellaert" where Crossref prints "F.".',
    verified:
      'DBLP publication record for doi:10.1109/TRO.2008.2006706 (journals/trob/KaessRD08) read 2026-08-20.',
  },
  {
    id: 'cutkosky-1989',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Mark R." matches the DBLP author record "Mark R. Cutkosky", whose publication list includes this exact DOI, where Crossref prints "M.R.".',
    verified:
      'DBLP author page pid 34/2886 ("Mark R. Cutkosky") lists "On grasp choice, grasp models, and the design of hands for manufacturing tasks", doi:10.1109/70.34763, IEEE Trans. Robotics Autom. 1989; read 2026-08-20.',
  },
  {
    id: 'albu-schaffer-2003',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      '"Christian" matches the DBLP byline "Christian Ott" where Crossref prints "C."; author 4 keeps the printed initial "G." in the registry.',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.2003.1242067 (Christian Ott 0001, Alin Albu-Sch\u00e4ffer, Andreas Kugi, Gerd Hirzinger; ICRA 2003) read 2026-08-20.',
  },
  {
    id: 'albu-schaffer-2003',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      '"Alin" matches the DBLP byline "Alin Albu-Sch\u00e4ffer" where Crossref prints "A.".',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.2003.1242067 (ICRA 2003) read 2026-08-20.',
  },
  {
    id: 'albu-schaffer-2003',
    skip: 'author-expansion',
    authorIndex: 3,
    reason:
      '"Andreas" matches the DBLP byline "Andreas Kugi" where Crossref prints "A.".',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.2003.1242067 (ICRA 2003) read 2026-08-20.',
  },
  {
    id: 'di-carlo-2018',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "Jared Di Carlo" vs Crossref family "Di Carlo": same name; the registry string stores the multi-word family unsplit, which the primary-name comparison accepts.',
    verified: 'Crossref record 10.1109/IROS.2018.8594448 read 2026-08-20.',
  },
  {
    id: 'mason-1981',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "Matthew Mason" vs Crossref "Matthew T. Mason": same person and primary name; missing middle initial only.',
    verified: 'Crossref record 10.1109/TSMC.1981.4308708 read 2026-08-20.',
  },
  {
    id: 'smith-1990',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "Randall C. Smith" vs Crossref "Randall Smith" (book-chapter record omits the middle initial): same person, primary names identical.',
    verified: 'Crossref record 10.1007/978-1-4613-8997-2_14 read 2026-08-20.',
  },
  {
    id: 'whitney-1969',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "Daniel E. Whitney" vs Crossref "Daniel Whitney" for the 1969 TMMS record; other Crossref Whitney records print "Daniel E.".',
    verified: 'Crossref record 10.1109/TMMS.1969.299896 read 2026-08-20.',
  },
  {
    id: 'wampler-1986',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "Charles W. Wampler" vs Crossref "Charles Wampler": same person and primary name; Crossref middle-initial inconsistency.',
    verified: 'Crossref record 10.1109/TSMC.1986.289285 read 2026-08-20.',
  },
  {
    id: 'qin-badgwell-2003',
    skip: 'author',
    authorIndex: 1,
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
    skip: 'no-authors',
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
