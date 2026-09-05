import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ZITRO_API_BASE_URL } from '../tokens';
import { CustomerEndpoints } from '../endpoints';

export interface GameScoreResult {
  highestTile: number;
  score: number;
  couponType: string | null;
  couponCode: string | null;
  nextEligibleAt: string | null;
  rewardEarned: boolean;
}

/** Wraps POST /api/game/score — upserts the 2048 game score/reward state by device token. */
@Injectable({ providedIn: 'root' })
export class GameApiService {
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  submitScore(
    deviceToken: string,
    score: number,
    gameLevel: number,
  ): Observable<GameScoreResult> {
    return this.http.post<GameScoreResult>(
      `${this.baseUrl}${CustomerEndpoints.game.submitScore()}`,
      {
        deviceToken,
        score,
        gameLevel,
      },
    );
  }
}
