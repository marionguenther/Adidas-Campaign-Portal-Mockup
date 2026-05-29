import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./timeline/timeline.component').then((m) => m.TimelineComponent),
  },
  { path: '**', redirectTo: '' },
];
