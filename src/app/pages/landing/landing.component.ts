import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { NegocioService, Servicio, Turno, Barbero, Galeria, SlotDisponible } from '../../negocio.service';
import { ChatWidgetComponent } from '../../components/chat-widget/chat-widget.component';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChatWidgetComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  servicios: Servicio[] = [];
  barberos: Barbero[] = [];
  galeria: Galeria[] = [];
  categorias: { nombre: string; imagen: string; servicios: Servicio[] }[] = [
    { nombre: 'Corte',      imagen: '/categorias/corte.jpg',      servicios: [] },
    { nombre: 'Barba',      imagen: '/categorias/barba.jpg',      servicios: [] },
    { nombre: 'Combo',      imagen: '/categorias/combo.jpg',      servicios: [] },
    { nombre: 'Coloración', imagen: '/categorias/coloracion.jpg', servicios: [] },
  ];
  categoriaModal: { nombre: string; imagen: string; servicios: Servicio[] } | null = null;

  reservaForm = { paciente: '', telefono: '', servicio: '', fecha: '', hora: '', barberoId: '' };
  slotsDisponibles: SlotDisponible[] = [];
  cargandoSlots = false;
  enviando = false;
  mensajeReserva = '';
  exito = false;

  navScrolled = false;
  navOpen = false;
  readonly minDate = new Date().toISOString().split('T')[0];

  carouselIndex = 0;
  private carouselTimer: any;

  heroBgUrl = '';
  heroBgLoaded = false;
  reservaModalOpen = false;

  readonly testimonios = [
    {
      iniciales: 'FM', nombre: 'Federico M.', servicio: 'Corte + Barba',
      texto: 'El mejor barbero de Montevideo sin dudas. Ya llevo 2 años viniendo cada mes y el resultado siempre supera las expectativas. Lugar y atención impecables.'
    },
    {
      iniciales: 'SR', nombre: 'Sebastián R.', servicio: 'Perfilado de barba',
      texto: 'Ambiente premium, técnica profesional y atención de primer nivel. El único lugar donde confío mi barba. Imposible encontrar algo igual en la ciudad.'
    },
    {
      iniciales: 'MK', nombre: 'Martín K.', servicio: 'Corte clásico',
      texto: 'Reservé online en 2 minutos, puntualidad total y el corte exactamente como lo pedí. El sistema de turnos es brillante. 100% recomendado.'
    },
  ];

  constructor(
    private negocio: NegocioService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  @HostListener('window:scroll')
  onScroll() { this.navScrolled = window.scrollY > 60; }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.reservaModalOpen) this.cerrarReservaModal(); }

  ngOnInit() {
    this.negocio.getServicios().subscribe({
      next: s => {
        this.servicios = s;
        this.categorias = this.agruparCategorias(s);
        this.cdr.detectChanges();
        this.refreshScrollTrigger();
      }
    });
    this.negocio.getBarberos().subscribe({
      next: b => { this.barberos = b; this.cdr.detectChanges(); this.refreshScrollTrigger(); }
    });
    this.negocio.getGaleria().subscribe({
      next: g => {
        this.galeria = g;
        if (g.length > 0) {
          this.heroBgUrl = this.negocio.resolveImageUrl(g[0].imagenUrl);
          setTimeout(() => { this.heroBgLoaded = true; this.cdr.detectChanges(); }, 80);
        }
        this.cdr.detectChanges();
        this.refreshScrollTrigger();
        if (g.length > 1) this.startCarousel();
      }
    });
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.animateHero();
      this.setupScrollAnimations();
      this.setupCardHovers();
    });
  }

  ngOnDestroy() {
    ScrollTrigger.getAll().forEach(t => t.kill());
    clearInterval(this.carouselTimer);
    document.body.style.overflow = '';
  }

  private animateHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-badge',      { scale: 0.8, y: 20, opacity: 0, duration: 0.6, ease: 'back.out(2.5)' }, 0.15)
      .from('.hero-title-line', { y: 80, opacity: 0, rotateX: 18, transformPerspective: 700, duration: 0.85, stagger: 0.16, clearProps: 'transform,rotateX,transformPerspective' }, 0.3)
      .from('.hero-subtitle',   { y: 25, opacity: 0, duration: 0.6 }, 0.68)
      .from('.hero-cta > *',    { y: 24, opacity: 0, scale: 0.88, duration: 0.55, stagger: 0.14, ease: 'back.out(1.8)' }, 0.85)
      .from('.hero-stat',       { y: 28, opacity: 0, scale: 0.82, duration: 0.55, stagger: 0.12, ease: 'back.out(2)' }, 1.05)
      .from('.float-card',      { scale: 0.45, opacity: 0, rotation: 14, duration: 0.85, stagger: 0.18, ease: 'back.out(2.5)' }, 0.42)
      .from('.float-rating',    { scale: 0, opacity: 0, duration: 0.75, ease: 'elastic.out(1, 0.45)' }, 1.25);
  }

  private setupScrollAnimations() {
    // Section headers: eyebrow clip reveal → title slide → underline draw
    document.querySelectorAll('[data-scroll="section"]').forEach(el => {
      const eyebrow   = el.querySelector('.eyebrow');
      const title     = el.querySelector('.section-title');
      const desc      = el.querySelector('.section-desc');
      const underline = el.querySelector('.section-underline');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      if (eyebrow)   tl.from(eyebrow,   { clipPath: 'inset(0 100% 0 0)', opacity: 0, duration: 0.55, ease: 'power3.inOut' });
      if (title)     tl.from(title,     { y: 55, opacity: 0, duration: 0.75, ease: 'power3.out' }, '-=0.2');
      if (desc)      tl.from(desc,      { y: 20, opacity: 0, duration: 0.5,  ease: 'power2.out' }, '-=0.35');
      if (underline) tl.from(underline, { scaleX: 0, duration: 0.65, ease: 'power3.inOut', transformOrigin: 'left center' }, '-=0.25');
    });

    // Card grids: scale pop with staggered back.out
    document.querySelectorAll('[data-scroll="grid"]').forEach(container => {
      const items = container.querySelectorAll('[data-scroll-item]');
      gsap.from(items, {
        y: 65, scale: 0.88, opacity: 0, duration: 0.75,
        stagger: { amount: 0.45, ease: 'power1.in' },
        ease: 'back.out(1.8)',
        scrollTrigger: { trigger: container, start: 'top 82%', once: true }
      });
    });

    // Counters
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = +(el.getAttribute('data-count') || 0);
      const suffix = el.getAttribute('data-suffix') || '';
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; }
      });
    });

    // Feature cards: scale pop stagger (replaces slide-left)
    const featureGrid = document.querySelector('.features-grid');
    if (featureGrid) {
      const cards = featureGrid.querySelectorAll('.feature-card');
      gsap.from(cards, {
        y: 60, scale: 0.82, opacity: 0, duration: 0.72,
        stagger: { amount: 0.38, ease: 'power1.in' },
        ease: 'back.out(2.2)',
        scrollTrigger: { trigger: featureGrid, start: 'top 85%', once: true }
      });
    }

    // Booking panel: subtle 3D flip entrance
    const bookingPanel = document.querySelector('.booking-panel');
    if (bookingPanel) {
      gsap.from(bookingPanel, {
        rotateX: 8, y: 60, opacity: 0, transformPerspective: 1200, duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: bookingPanel, start: 'top 85%', once: true }
      });
    }

    // Gallery carousel: slide up + scale
    const galleryWrap = document.querySelector('.gallery-carousel-wrap');
    if (galleryWrap) {
      gsap.from(galleryWrap, {
        y: 80, opacity: 0, scale: 0.96, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: galleryWrap, start: 'top 85%', once: true }
      });
    }

    // CTA gold button: shimmer sweep on hover
    document.querySelectorAll('.btn-gold').forEach(btn => {
      const el = btn as HTMLElement;
      if (el.dataset['shimmerInit']) return;
      el.dataset['shimmerInit'] = '1';
      const shimmer = document.createElement('div');
      shimmer.style.cssText = 'position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);pointer-events:none;z-index:1;';
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.appendChild(shimmer);
      el.addEventListener('mouseenter', () => {
        gsap.fromTo(shimmer, { x: '-100%' }, { x: '250%', duration: 0.55, ease: 'power2.inOut' });
      });
    });
  }

  private refreshScrollTrigger() {
    setTimeout(() => {
      ScrollTrigger.refresh();
      this.zone.runOutsideAngular(() => this.setupCardHovers());
    }, 80);
  }

  private setupCardHovers() {
    const selectors = '.cat-card, .barber-card, .feature-card, .testimonial-card';
    document.querySelectorAll(selectors).forEach(card => {
      const el = card as HTMLElement;
      if (el.dataset['hoverInit']) return;
      el.dataset['hoverInit'] = '1';

      el.addEventListener('mousemove', (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        gsap.to(el, {
          rotateY: x * 8, rotateX: -y * 8,
          duration: 0.35, ease: 'power2.out',
          transformPerspective: 900,
        });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, {
          rotateX: 0, rotateY: 0,
          duration: 0.6, ease: 'elastic.out(1, 0.5)',
        });
      });

      el.addEventListener('mouseenter', () => {
        gsap.to(el.querySelector('.feature-icon, .barber-avatar-wrap, .cat-img-wrap img'), {
          scale: 1.12, duration: 0.4, ease: 'back.out(2)',
        });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el.querySelector('.feature-icon, .barber-avatar-wrap, .cat-img-wrap img'), {
          scale: 1, duration: 0.4, ease: 'power2.out',
        });
      });
    });
  }

  // ── Reserva modal ─────────────────────────────────────────────────
  abrirReservaModal() {
    this.mensajeReserva = '';
    this.reservaModalOpen = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        gsap.fromTo('.reserva-modal-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
        gsap.fromTo('.reserva-modal-panel',
          { scale: 0.88, y: 50, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.8)' }
        );
      }, 0);
    });
  }

  cerrarReservaModal() {
    this.zone.runOutsideAngular(() => {
      gsap.to('.reserva-modal-panel', {
        scale: 0.92, y: 24, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => this.zone.run(() => {
          this.reservaModalOpen = false;
          document.body.style.overflow = '';
          this.cdr.detectChanges();
        })
      });
      gsap.to('.reserva-modal-backdrop', { opacity: 0, duration: 0.3, ease: 'power2.in' });
    });
  }

  // ── Carousel ──────────────────────────────────────────────────────
  startCarousel() {
    this.carouselTimer = setInterval(() => {
      this.zone.run(() => {
        this.carouselIndex = (this.carouselIndex + 1) % this.galeria.length;
      });
    }, 5000);
  }

  nextSlide() {
    clearInterval(this.carouselTimer);
    this.carouselIndex = (this.carouselIndex + 1) % this.galeria.length;
    this.startCarousel();
  }

  prevSlide() {
    clearInterval(this.carouselTimer);
    this.carouselIndex = (this.carouselIndex - 1 + this.galeria.length) % this.galeria.length;
    this.startCarousel();
  }

  goToSlide(i: number) {
    clearInterval(this.carouselTimer);
    this.carouselIndex = i;
    this.startCarousel();
  }

  // ── Services ──────────────────────────────────────────────────────
  private readonly CATEGORIA_IMGS: Record<string, string> = {
    'Corte':      '/categorias/corte.jpg',
    'Barba':      '/categorias/barba.jpg',
    'Combo':      '/categorias/combo.jpg',
    'Coloración': '/categorias/coloracion.jpg',
  };

  private readonly CATEGORIA_ORDEN = ['Corte', 'Barba', 'Combo', 'Coloración'];

  private agruparCategorias(servicios: Servicio[]) {
    const map = new Map<string, Servicio[]>();
    for (const s of servicios) {
      const cat = this.negocio.normalizarCategoria(s.categoria || '');
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return this.CATEGORIA_ORDEN.map(cat => ({
      nombre: cat,
      imagen: this.CATEGORIA_IMGS[cat] ?? '',
      servicios: map.get(cat) ?? []
    }));
  }

  minPrecio(servicios: Servicio[]): number {
    if (!servicios.length) return 0;
    return Math.min(...servicios.map(s => s.precio));
  }

  img(url: string | undefined): string {
    return this.negocio.resolveImageUrl(url);
  }

  modalServCarruselMap = new Map<number, number>();
  servicioModalImgs(s: Servicio): string[] {
    const cat = this.negocio.normalizarCategoria(s.categoria || '');
    const catImg = this.CATEGORIA_IMGS[cat] ?? '';
    const uploaded = [s.imagenUrl, s.imagenUrl2, s.imagenUrl3].filter(Boolean) as string[];
    return catImg ? [catImg, ...uploaded] : uploaded;
  }
  modalCarruselIdx(id: number) { return this.modalServCarruselMap.get(id) ?? 0; }
  modalCarruselNext(id: number, max: number, e: Event) {
    e.stopPropagation();
    this.modalServCarruselMap.set(id, (this.modalCarruselIdx(id) + 1) % max);
  }
  modalCarruselPrev(id: number, max: number, e: Event) {
    e.stopPropagation();
    this.modalServCarruselMap.set(id, (this.modalCarruselIdx(id) - 1 + max) % max);
  }

  abrirCategoria(cat: typeof this.categorias[0]) {
    this.modalServCarruselMap.clear();
    this.categoriaModal = cat;
  }
  cerrarModal() { this.categoriaModal = null; }

  seleccionarServicio(s: Servicio) {
    this.reservaForm.servicio = s.nombre;
    this.slotsDisponibles = [];
    this.categoriaModal = null;
    this.abrirReservaModal();
  }

  scrollTo(id: string) {
    this.navOpen = false;
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  }

  onFechaOServicioCambia() {
    this.slotsDisponibles = [];
    this.reservaForm.hora = '';
    if (!this.reservaForm.fecha || !this.reservaForm.servicio) return;
    this.cargandoSlots = true;
    const barberoId = this.reservaForm.barberoId ? +this.reservaForm.barberoId : undefined;
    this.negocio.getDisponibilidad(this.reservaForm.fecha, this.reservaForm.servicio, barberoId).subscribe({
      next: slots => { this.slotsDisponibles = slots; this.cargandoSlots = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoSlots = false; this.cdr.detectChanges(); }
    });
  }

  seleccionarSlot(slot: SlotDisponible) {
    this.reservaForm.hora = slot.hora;
    if (!this.reservaForm.barberoId) this.reservaForm.barberoId = String(slot.barberoId);
  }

  enviarReserva() {
    if (!this.reservaForm.paciente || !this.reservaForm.fecha || !this.reservaForm.hora || !this.reservaForm.servicio) return;
    this.enviando = true;
    this.mensajeReserva = '';
    const turno: Turno = {
      paciente: this.reservaForm.paciente,
      telefono: this.reservaForm.telefono,
      servicio: this.reservaForm.servicio,
      fecha: this.reservaForm.fecha,
      hora: this.reservaForm.hora,
      barberoId: this.reservaForm.barberoId ? +this.reservaForm.barberoId : undefined
    };
    this.negocio.crearTurno(turno).subscribe({
      next: t => {
        this.exito = true;
        const barbero = this.barberos.find(b => b.id === t.barberoId);
        const conBarbero = barbero ? ` con ${barbero.nombre}` : '';
        this.mensajeReserva = `✅ ¡Turno confirmado! Te esperamos el ${t.fecha} a las ${t.hora}${conBarbero}.`;
        this.reservaForm = { paciente: '', telefono: '', servicio: '', fecha: '', hora: '', barberoId: '' };
        this.slotsDisponibles = [];
        this.enviando = false;
        this.cdr.detectChanges();
        setTimeout(() => { if (this.reservaModalOpen) this.cerrarReservaModal(); }, 3200);
      },
      error: (err: HttpErrorResponse) => {
        this.exito = false;
        this.mensajeReserva = err.status === 409
          ? '⚠️ Ese horario ya fue tomado. Por favor elegí otro.'
          : '❌ Error al reservar. Intentá de nuevo o contactanos directamente.';
        if (err.status === 409) this.onFechaOServicioCambia();
        this.enviando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
