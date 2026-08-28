import { Pipe, PipeTransform } from '@angular/core';

/**
 * UahPipe — formats a number as Ukrainian hryvnia.
 *
 * Output format:  "1 234 UAH"  (space-separated thousands, code suffix)
 * Usage:          {{ value | uah }}
 */
@Pipe({ name: 'uah', standalone: true, pure: true })
export class UahPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '— UAH';
    const formatted = Math.round(value)
      .toLocaleString('uk-UA')          // "1 234" with UA space-separator
      .replace(/\s/g, '\u00A0');        // non-breaking spaces
    return `${formatted}\u00A0UAH`;
  }
}
