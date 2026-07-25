class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number | null = null;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private smoothingFactor(tE: number, cutoff: number) {
    const r = 2 * Math.PI * cutoff * tE;
    return r / (r + 1);
  }

  private exponentialSmoothing(a: number, x: number, xPrev: number) {
    return a * x + (1 - a) * xPrev;
  }

  filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null || this.dxPrev === null) {
      this.tPrev = t;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    const tE = t - this.tPrev;
    if (tE <= 0) return this.xPrev; // Avoid division by zero

    // The filtered derivative of the signal
    const dx = (x - this.xPrev) / tE;
    const aD = this.smoothingFactor(tE, this.dCutoff);
    const dxFiltered = this.exponentialSmoothing(aD, dx, this.dxPrev);

    // The filtered signal
    const cutoff = this.minCutoff + this.beta * Math.abs(dxFiltered);
    const a = this.smoothingFactor(tE, cutoff);
    const xFiltered = this.exponentialSmoothing(a, x, this.xPrev);

    this.xPrev = xFiltered;
    this.dxPrev = dxFiltered;
    this.tPrev = t;

    return xFiltered;
  }
}

export class Vector3OneEuroFilter {
  xFilter: OneEuroFilter;
  yFilter: OneEuroFilter;
  zFilter: OneEuroFilter;

  constructor(minCutoff = 0.5, beta = 0.1) {
    // minCutoff reduces jitter at slow speeds (lower = less jitter but more lag)
    // beta reduces lag at high speeds (higher = less lag but more jitter)
    this.xFilter = new OneEuroFilter(minCutoff, beta);
    this.yFilter = new OneEuroFilter(minCutoff, beta);
    this.zFilter = new OneEuroFilter(minCutoff, beta);
  }

  filter(x: number, y: number, z: number, timestamp: number) {
    return {
      x: this.xFilter.filter(x, timestamp),
      y: this.yFilter.filter(y, timestamp),
      z: this.zFilter.filter(z, timestamp)
    };
  }
}
