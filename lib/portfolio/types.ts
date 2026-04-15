export type PortfolioSnapshotOverview = {
  id: string;
  parqet_portfolio_id: string;
  name: string;
  total_value: number;
  currency: string;
  total_gain_loss: number | null;
  total_gain_loss_pct: number | null;
  fetched_at: string;
};

export type PortfolioPositionBrief = {
  id: string;
  snapshot_id: string;
  name: string;
  ticker: string | null;
  current_value: number;
  weight_pct: number | null;
};

/** Ein Messpunkt Gesamtvermögen (typisch nach Parqet-Sync). */
export type PortfolioHistoryPoint = {
  recorded_at: string;
  total_value: number;
  currency: string;
};

export type PortfolioOverviewData = {
  snapshots: PortfolioSnapshotOverview[];
  positionsBySnapshot: Record<string, PortfolioPositionBrief[]>;
  totalWealth: number;
  currency: string;
  /** Aufsteigend nach Zeit — für Dashboard-Chart / Zeitraumfilter. */
  history: PortfolioHistoryPoint[];
  /**
   * Zeitreihe aus Parqet POST /performance, falls auslesbar; sonst leer.
   * Gleiche Form wie `history` (`recorded_at` = Parqet-Zeitstempel).
   */
  parqetSeries: PortfolioHistoryPoint[];
  error: string | null;
};
