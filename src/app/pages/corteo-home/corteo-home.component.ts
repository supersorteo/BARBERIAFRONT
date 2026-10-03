import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-corteo-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './corteo-home.component.html',
  styleUrl: './corteo-home.component.css'
})
export class CorteoHomeComponent {
  scrolled = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 40;
  }
}
