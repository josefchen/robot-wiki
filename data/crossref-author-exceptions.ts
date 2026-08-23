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
 * planted "Petra Svestka" at the unprotected position 2 of kavraki-1996
 * (the registry keeps Crossref's printed initial "P." there) survived a
 * green run. That position, not albu-schaffer-2003 author 4, is the
 * current red-phase plant target: author 4 of albu-schaffer-2003 gained
 * its own scoped expansion exception on 2026-08-23 ("Gerd Hirzinger"),
 * so a plant there no longer bites. Position-less author
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
    id: 'albu-schaffer-2003',
    skip: 'author-expansion',
    authorIndex: 4,
    reason:
      '"Gerd" expands Crossref initial "G."; DBLP\u2019s publication record for the DOI transcribes the byline "Gerd Hirzinger" (author pid h/GerdHirzinger).',
    verified:
      'DBLP publication record for doi:10.1109/ROBOT.2003.1242067 (conf/icra/OttAKH03: Christian Ott 0001, Alin Albu-Sch\u00e4ffer, Andreas Kugi, Gerd Hirzinger) read 2026-08-23.',
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
  // ---- arXiv-source entries (sweep extension, 2026-08-20) ----
  // Evidence rule for these is the same as above: a record that transcribes
  // the byline. arXiv's OWN Atom feed and abs page are treated as
  // transcriptions where they print a coherent byline; where the feed is
  // visibly defective (an author literally named ":", or one human split
  // into two author elements), a DBLP record supplies the transcription.
  {
    id: 'gr00t-n1-2025',
    skip: 'author-count',
    reason:
      'The arXiv feed and abs citation_author metadata print 43 elements because of a stray ":" author element after "NVIDIA"; DBLP (journals/corr/abs-2503-14734) transcribes 42 entries (the org plus 41 named authors), exactly the registry count.',
    verified:
      'DBLP publication record journals/corr/abs-2503-14734 (41 named authors plus the org) and the arXiv abs citation_author list for 2503.14734 (43 entries including ":") compared 2026-08-20.',
  },
  {
    id: 'gr00t-n1-2025',
    skip: 'author',
    authorIndex: 2,
    reason:
      'The arXiv Atom feed and abs citation_author metadata print a stray ":" author element after "NVIDIA" (an arXiv metadata artifact), shifting every later position. DBLP (journals/corr/abs-2503-14734) transcribes the byline as 41 authors, "Johan Bjorck, Fernando Castañeda, ..." with no ":" element, matching the registry exactly.',
    verified:
      'DBLP publication record journals/corr/abs-2503-14734 (41 authors, no ":" element) and the arXiv abs citation_author list for 2503.14734 (43 entries including "NVIDIA" and ":") compared 2026-08-20.',
  },
  {
    id: 'vjepa2-2025',
    skip: 'author-count',
    reason:
      'The arXiv feed and abs metadata split one human into two author elements ("Mojtaba" and "Komeili" as adjacent authors 6 and 7), reporting 30 authors. DBLP transcribes "Mojtaba Komeili" as one person and 29 authors total, exactly the registry list.',
    verified:
      'DBLP publication record for V-JEPA 2 (29 authors, "Mojtaba Komeili" single entry; first eight read: Mido Assran, Adrien Bardes, David Fan 0001, Quentin Garrido, Russell Howes, Mojtaba Komeili, Matthew J. Muckley, Ammar Rizvi) read 2026-08-20; arXiv feed for 2506.09985 prints 30 elements with the split.',
  },
  {
    id: 'vjepa2-2025',
    skip: 'author',
    authorIndex: 6,
    reason:
      'Registry "Mojtaba Komeili" vs the feed\'s split elements at positions 6/7: same person, confirmed by the DBLP byline transcription.',
    verified:
      'DBLP publication record for V-JEPA 2 read 2026-08-20.',
  },
  {
    id: 'pi05-2025',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "Physical Intelligence" vs feed family "Intelligence": the collective first author the arXiv byline prints as a single string; the naive last-token split breaks the org name. DBLP transcribes the same element verbatim.',
    verified:
      'DBLP journals/corr/abs-2504-16054 author list ("Physical Intelligence" as entry 1) read 2026-08-20.',
  },
  {
    id: 'open-x-embodiment-2023',
    skip: 'author-count',
    reason:
      'Registry lists the collective author "Open X-Embodiment Collaboration" (the byline the paper itself prints) rather than its 294 underlying contributor names; a per-contributor expansion is not warranted for a collaboration credit.',
    verified:
      'arXiv feed for 2310.08864 (294 authors, first element "Open X-Embodiment Collaboration") read 2026-08-20; the registry cites the collective byline the paper prints.',
  },
  {
    id: 'openai-rubiks-cube-2019',
    skip: 'author-count',
    reason:
      'Registry lists the org plus the first two named authors ("OpenAI, Ilge Akkaya, Marcin Andrychowicz"), the leading transcription of a 19-author list; the full arXiv list matches those three in the same positions.',
    verified:
      'arXiv feed for 1910.07113 (19 authors: OpenAI, Ilge Akkaya, Marcin Andrychowicz, ...) read 2026-08-20; leading-three convention documented in the entry.',
  },
  {
    id: 'droid-2024',
    skip: 'author-count',
    reason:
      'Registry lists the first three of 101 authors, with the count and convention documented in the entry comment; the first three match the arXiv byline in order.',
    verified:
      'arXiv feed for 2403.12945 (101 authors: Alexander Khazatsky, Karl Pertsch, Suraj Nair, ...) read 2026-08-20.',
  },
  {
    id: 'bridgedata-v2-2023',
    skip: 'author-count',
    reason:
      'Registry lists the first three of 14 authors, count and convention documented in the entry comment; the first three match the arXiv byline in order.',
    verified:
      'arXiv feed for 2308.12952 (14 authors: Homer Walke, Kevin Black, Abraham Lee, ...) read 2026-08-20.',
  },
  {
    id: 'isaac-lab-2025',
    skip: 'author-count',
    reason:
      'The arXiv feed prints 107 author elements because it splits the org credit into "NVIDIA" and a stray ":"; DBLP transcribes the byline as two credited authors, NVIDIA and Mayank Mittal, exactly the registry.',
    verified:
      'DBLP publication record for Isaac Lab (journals/corr/abs-2511-04831; 1 named record plus the org: "NVIDIA") and the arXiv abs citation_author list (107 entries including ":") compared 2026-08-20.',
  },
  {
    id: 'isaac-lab-2025',
    skip: 'author',
    authorIndex: 2,
    reason:
      'Registry "NVIDIA" vs the feed\'s stray ":" at position 2: the feed splits the org credit into "NVIDIA" and ":"; the byline credit is the org alone.',
    verified:
      'DBLP publication record for Isaac Lab read 2026-08-20; arXiv abs citation_author list for 2511.04831 read 2026-08-20.',
  },
  {
    id: 'agibot-world-2025',
    skip: 'author-count',
    reason:
      'Registry "AgiBot Research" cites the collective byline credit; the arXiv feed prints 52 elements beginning "AgiBot-World-Contributors" followed by named contributors. The collective form is the credit the paper prints as its author line.',
    verified:
      'arXiv feed for 2503.06669 (52 elements, first "AgiBot-World-Contributors") read 2026-08-20.',
  },
  {
    id: 'agibot-world-2025',
    skip: 'author',
    authorIndex: 1,
    reason:
      'Registry "AgiBot Research" vs feed "AgiBot-World-Contributors": the same collective credit under the name the venue page prints; not a named-person divergence.',
    verified:
      'arXiv feed for 2503.06669 read 2026-08-20.',
  },
  {
    id: 'gemini-robotics-2025',
    skip: 'author-count',
    reason:
      'Registry cites the collective byline "Gemini Robotics Team, Google DeepMind"; the arXiv feed expands it to 118 named contributors. The collective credit is what the paper prints as its author line.',
    verified:
      'arXiv feed for 2503.20020 (118 elements, first "Gemini Robotics Team") read 2026-08-20.',
  },
  {
    id: 'gemini-robotics-2025',
    skip: 'author',
    authorIndex: 2,
    reason:
      'Registry "Google DeepMind" vs the feed\'s first named contributor at position 2: the registry holds the two collective credits the byline prints, not the expanded contributor list.',
    verified:
      'arXiv feed for 2503.20020 read 2026-08-20.',
  },
  {
    id: 'gemini-robotics-15-2025',
    skip: 'author-count',
    reason:
      'Same collective-byline convention as gemini-robotics-2025: registry "Gemini Robotics Team, Google DeepMind", feed expands to 172 named contributors.',
    verified:
      'arXiv feed for 2510.03342 (172 elements, first "Gemini Robotics Team") read 2026-08-20.',
  },
  {
    id: 'gemini-robotics-15-2025',
    skip: 'author',
    authorIndex: 2,
    reason:
      'Registry "Google DeepMind" vs the feed\'s first named contributor at position 2; collective byline, see above.',
    verified:
      'arXiv feed for 2510.03342 read 2026-08-20.',
  },
  {
    id: 'pi-rl-2026',
    skip: 'year',
    reason:
      'arXiv prints the v1 submission year 2025; the registry deliberately names 2026 because the entry cites v3 (2026-01-29), the version with the full Flow-Noise/Flow-SDE treatment that rl-finetuning.mdx describes. The registry year policy for versioned arXiv entries follows the cited version, and the prose author-year mention follows the registry so the reader sees one year.',
    verified:
      'arXiv API for 2510.25889 re-read 2026-08-21: published 2025-10-29T18:37:39Z, latest updated 2026-01-29T16:00:57Z, feed id .../abs/2510.25889v3.',
  },
  {
    id: 'hinterstoisser-2012',
    skip: 'year',
    reason:
      'Springer dates the LNCS volume 2013, the year the proceedings were printed; the registry cites 2012, the year of the conference the paper was presented at and the year the ADD metric is universally credited to. The Crossref record itself names the venue as ACCV 2012 in its container title, so the two figures are the same event described by different conventions.',
    verified:
      'Crossref 10.1007/978-3-642-37331-2_42 read 2026-08-22: container-title ["Lecture Notes in Computer Science", "Computer Vision - ACCV 2012"], issued 2013, published-print 2013.',
  },
  {
    id: 'cleargrasp-2020',
    skip: 'title',
    reason:
      'Crossref renders the paper name as two words, "Clear Grasp", which splits the coined single-word system name. The authors write it as one word, "ClearGrasp", throughout, and that is the name the prose and the glossary use, so matching Crossref here would introduce a system name that appears nowhere in the literature.',
    verified:
      'arXiv abs/1910.02550 citation_title meta tag read 2026-08-22: "ClearGrasp: 3D Shape Estimation of Transparent Objects for Manipulation", one word.',
  },
  {
    id: 'keselman-2017-realsense',
    skip: 'title',
    reason:
      'The Crossref title embeds the ASCII trademark markers Intel files with IEEE, "Intel(R) RealSense(TM)". The registry drops them, which is how the authors themselves print the title and how the rest of this registry handles trademarked product names. Reproducing the markers would put (R) and (TM) into the rendered reference list.',
    verified:
      'arXiv abs/1705.05548 citation_title meta tag read 2026-08-22: "Intel RealSense Stereoscopic Depth Cameras", no trademark markers.',
  },
  {
    id: 'moravec-elfes-1985',
    skip: 'author-expansion',
    authorIndex: 1,
    reason:
      'Crossref prints the 1985 ICRA byline as the initial "H. Moravec". The paper itself prints "Hans P. Moravec", and the registry follows the printed byline per the author-field policy.',
    verified:
      'CMU Robotics Institute PDF (ri.cmu.edu/pub_files/pub4/moravec_hans_1985_1/moravec_hans_1985_1.pdf) read as text 2026-08-22: the title-page byline reads "Hans P. Moravec" over "The Robotics Institute, Carnegie-Mellon University".',
  },
  {
    id: 'moravec-elfes-1985',
    skip: 'author-expansion',
    authorIndex: 2,
    reason:
      'Crossref prints "A. Elfes"; the paper prints the full given name. Same printed-byline evidence as author 1.',
    verified:
      'Same CMU Robotics Institute PDF read 2026-08-22: the second byline name is "Alberto Elfes" (the scan renders it "Albert0 Elfes", an OCR substitution of 0 for o in a fixed-width scan). DBLP indexes the same paper as "Alberto Elfes".',
  },
  {
    id: 'kinectfusion-2011',
    skip: 'author',
    authorIndex: 7,
    reason:
      'Crossref prints "Pushmeet Kohi", dropping the l from Kohli. The paper byline and every other record spell it Kohli, and the registry keeps the correct spelling rather than propagating a Crossref typo into the reference list.',
    verified:
      'ISMAR 2011 PDF (microsoft.com/en-us/research/wp-content/uploads/2016/02/ismar2011.pdf) read as text 2026-08-22: the byline reads "Pushmeet Kohli". DBLP publ record for the same paper agrees.',
  },
  {
    id: 'kinectfusion-2011',
    skip: 'author',
    authorIndex: 2,
    reason:
      'Crossref reorders the byline, promoting Andrew Fitzgibbon from last to second. The registry follows the order the paper itself prints, which is what a reader comparing the reference against the PDF will see; the two lists hold the same ten people.',
    verified:
      'Same ISMAR 2011 PDF read 2026-08-22: byline order is Newcombe, Izadi, Hilliges, Molyneaux, Kim, Davison, Kohli, Shotton, Hodges, Fitzgibbon. DBLP prints the same order.',
  },
  {
    id: 'kinectfusion-2011',
    skip: 'author',
    authorIndex: 10,
    reason:
      'The mirror of the entry above: the reordering shifts every position between 2 and 10, and position 10 is the other end of the swap.',
    verified:
      'Same ISMAR 2011 PDF read 2026-08-22; Fitzgibbon is the tenth and final byline name.',
  },
];
