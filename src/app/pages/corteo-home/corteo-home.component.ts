import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-corteo-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './corteo-home.component.html',
  styleUrl: './corteo-home.component.css'
})
export class CorteoHomeComponent {}
