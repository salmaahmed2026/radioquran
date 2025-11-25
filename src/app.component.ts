
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlayerComponent } from './components/player/player.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerComponent]
})
export class AppComponent {
  title = 'quran-radio';
}
