import { Component } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-show',
  imports: [],
  templateUrl: './show.html',
  styleUrl: './show.scss',
})
export class Show {
  users: any[] = [];

  constructor(private apiService: ApiService) { }

  show(): void {
    console.log('test');
    this.req();
  }

  async req() {

    try {
      this.users = await this.apiService.getUsers();
      console.log(this.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }
}
