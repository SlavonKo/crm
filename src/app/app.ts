import { Component, signal } from '@angular/core';
import { Toolbar } from './shared/components/toolbar/toolbar';
import { RouterOutlet } from "@angular/router";
import { Show } from "./components/show/show";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Toolbar, RouterOutlet, Show],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('start');
}
