import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Campaign, CampaignPatch, ViewMeta } from '@wf/shared-types';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);

  getViewMeta(): Observable<ViewMeta> {
    return this.http.get<ViewMeta>('/api/view-meta');
  }

  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>('/api/campaigns');
  }

  updateCampaign(id: string, patch: CampaignPatch): Observable<Campaign> {
    return this.http.patch<Campaign>(`/api/campaigns/${encodeURIComponent(id)}`, patch);
  }
}
