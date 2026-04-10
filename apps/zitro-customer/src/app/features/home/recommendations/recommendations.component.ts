import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, CachedImageDirective, LoaderComponent],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.scss']
})
export class RecommendationsComponent implements OnChanges {
  @Input() recommendations: any[] = [];
  imageLoading: { [key: number]: boolean } = {};
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['recommendations'] && this.recommendations) {
      // Initialize image loading states when recommendations change
      this.recommendations.forEach((rec, index) => {
        this.imageLoading[index] = true;
      });
    }
  }
  
  onImageLoad(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  onImageError(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }
  
  navigate(rec: any) {
    // Implement navigation logic here
    if (rec.route) {
      // e.g., this.router.navigate([rec.route]);
    }
  }
}
