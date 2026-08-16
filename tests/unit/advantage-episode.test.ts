import { describe, expect, it } from 'vitest';
import {
  CREDIT_ASSIGNMENT,
  EPISODE_LENGTH_S,
  EPISODE_SEGMENTS,
  VALUE_TRACE,
  segmentAt,
  taggedSegments,
  valueAt,
} from '@/lib/advantage-episode';

describe('VALUE_TRACE and EPISODE_SEGMENTS', () => {
  it('covers the full episode with contiguous segments', () => {
    expect(EPISODE_SEGMENTS[0].start).toBe(0);
    expect(EPISODE_SEGMENTS[EPISODE_SEGMENTS.length - 1].end).toBe(
      EPISODE_LENGTH_S,
    );
    for (let i = 1; i < EPISODE_SEGMENTS.length; i += 1) {
      expect(EPISODE_SEGMENTS[i].start).toBe(EPISODE_SEGMENTS[i - 1].end);
    }
  });

  it('anchors the trace to the segment boundaries', () => {
    for (const segment of EPISODE_SEGMENTS) {
      expect(Number.isFinite(valueAt(segment.start))).toBe(true);
      expect(Number.isFinite(valueAt(segment.end))).toBe(true);
    }
  });

  it('the trace starts and ends inside the episode span', () => {
    expect(VALUE_TRACE[0].t).toBe(0);
    expect(VALUE_TRACE[VALUE_TRACE.length - 1].t).toBe(EPISODE_LENGTH_S);
  });
});

describe('valueAt', () => {
  it('returns exact values at keypoints', () => {
    for (const point of VALUE_TRACE) {
      expect(valueAt(point.t)).toBeCloseTo(point.v, 6);
    }
  });

  it('interpolates linearly between keypoints', () => {
    const a = VALUE_TRACE[0];
    const b = VALUE_TRACE[1];
    const mid = (a.t + b.t) / 2;
    expect(valueAt(mid)).toBeCloseTo((a.v + b.v) / 2, 6);
  });

  it('clamps outside the episode', () => {
    expect(valueAt(-5)).toBe(VALUE_TRACE[0].v);
    expect(valueAt(EPISODE_LENGTH_S + 5)).toBe(
      VALUE_TRACE[VALUE_TRACE.length - 1].v,
    );
  });
});

describe('segmentAt', () => {
  it('resolves the segment containing a time', () => {
    expect(segmentAt(4).id).toBe('reach');
    expect(segmentAt(12).id).toBe('grasp');
    expect(segmentAt(30).id).toBe('insert');
  });

  it('treats segment starts as inclusive and ends as exclusive', () => {
    expect(segmentAt(8).id).toBe('grasp');
    expect(segmentAt(7.999).id).toBe('reach');
  });

  it('maps the final instant to the last segment', () => {
    expect(segmentAt(EPISODE_LENGTH_S).id).toBe(
      EPISODE_SEGMENTS[EPISODE_SEGMENTS.length - 1].id,
    );
  });
});

describe('taggedSegments', () => {
  it('tags segments by the sign of the value change', () => {
    const tagged = taggedSegments();
    const byId = Object.fromEntries(tagged.map((s) => [s.id, s]));
    expect(byId.reach.tag).toBe('high');
    expect(byId.reach.delta).toBeGreaterThan(0);
    expect(byId.grasp.tag).toBe('low');
    expect(byId.grasp.delta).toBeLessThan(0);
    expect(byId.tamp.tag).toBe('high');
    expect(byId.insert.tag).toBe('low');
  });

  it('every segment carries a nonzero advantage (tags stay binary)', () => {
    for (const segment of taggedSegments()) {
      expect(segment.delta).not.toBe(0);
      expect(['high', 'low']).toContain(segment.tag);
    }
  });

  it('keeps every transition: no segment is dropped', () => {
    expect(taggedSegments()).toHaveLength(EPISODE_SEGMENTS.length);
  });
});

describe('CREDIT_ASSIGNMENT', () => {
  it('blames the grasp for the failure observed at insertion', () => {
    expect(CREDIT_ASSIGNMENT.failureSegmentId).toBe('insert');
    expect(CREDIT_ASSIGNMENT.blamedSegmentId).toBe('grasp');
  });

  it('the blamed action sits about 20 s before the failure', () => {
    const gap = CREDIT_ASSIGNMENT.failureAtS - CREDIT_ASSIGNMENT.blamedAtS;
    expect(gap).toBeGreaterThanOrEqual(19);
    expect(gap).toBeLessThanOrEqual(21);
  });

  it('the blamed segment is the low-advantage one inside the episode', () => {
    const blamed = taggedSegments().find(
      (s) => s.id === CREDIT_ASSIGNMENT.blamedSegmentId,
    );
    expect(blamed?.tag).toBe('low');
  });
});
