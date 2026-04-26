export interface KalmanOptions { Q?: number; R?: number; }
export interface KalmanResult {
  alpha: number[];
  beta: number[];
  resid: number[];
}

// 2-state Kalman: state s = [alpha, beta]^T.
// Dynamics: s_t = s_{t-1} + w_t,  w_t ~ N(0, Q*I)  (random walk)
// Observation: y_t = [1, x_t] * s_t + v_t,  v_t ~ N(0, R)
export function kalmanHedgeRatio(y: number[], x: number[], opts: KalmanOptions = {}): KalmanResult {
  if (y.length !== x.length) throw new Error('kalmanHedgeRatio: length mismatch');
  const n = y.length;
  const Q = opts.Q ?? 1e-4;
  const R = opts.R ?? 1e-3;

  // state mean s and covariance P
  let s = [0, 1];                                        // initial guess: alpha=0, beta=1
  let P = [[1, 0], [0, 1]];                              // initial covariance (broad)

  const alphaArr = new Array<number>(n);
  const betaArr = new Array<number>(n);
  const residArr = new Array<number>(n);

  for (let t = 0; t < n; t++) {
    // Predict: s_pred = s; P_pred = P + Q*I
    const Ppred = [[P[0][0] + Q, P[0][1]], [P[1][0], P[1][1] + Q]];
    const H = [1, x[t]];

    // Innovation
    const yHat = H[0] * s[0] + H[1] * s[1];
    const innov = y[t] - yHat;

    // Innovation variance: S = H * Ppred * H^T + R
    const PpredH = [Ppred[0][0] * H[0] + Ppred[0][1] * H[1], Ppred[1][0] * H[0] + Ppred[1][1] * H[1]];
    const S = H[0] * PpredH[0] + H[1] * PpredH[1] + R;

    // Kalman gain K = Ppred * H^T / S
    const K = [PpredH[0] / S, PpredH[1] / S];

    // Update state and covariance
    s = [s[0] + K[0] * innov, s[1] + K[1] * innov];
    // P = (I - K H) Ppred
    const KH = [[K[0] * H[0], K[0] * H[1]], [K[1] * H[0], K[1] * H[1]]];
    P = [
      [(1 - KH[0][0]) * Ppred[0][0] - KH[0][1] * Ppred[1][0], (1 - KH[0][0]) * Ppred[0][1] - KH[0][1] * Ppred[1][1]],
      [-KH[1][0] * Ppred[0][0] + (1 - KH[1][1]) * Ppred[1][0], -KH[1][0] * Ppred[0][1] + (1 - KH[1][1]) * Ppred[1][1]],
    ];

    alphaArr[t] = s[0];
    betaArr[t] = s[1];
    residArr[t] = innov;
  }

  return { alpha: alphaArr, beta: betaArr, resid: residArr };
}
