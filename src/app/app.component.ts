import { Component } from '@angular/core';
import { Subscription, retry, timer } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { HeartbeatService } from './heartbeat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'TestWebSockets';
  webSocket$: WebSocketSubject<any> | undefined;
  subscription: Subscription = <Subscription>{};
  public log: string = "";
  private currentPath: string = "";

  constructor(
    private _heartBeatService: HeartbeatService,
  ) {
    this._heartBeatService.serviceState.subscribe((state: boolean) => {
      if (this.currentPath === "") return;
      if (state) {
        if (this.webSocket$ !== undefined && !this.webSocket$.closed) return;
        this.log = this.log + `[this._heartBeatService.serviceState.subscribe][${this.currentPath}] Server is up.  Resubscribing to [${this.currentPath}]\n`;
        this.createWebSocketSubject(this.currentPath);
      } else {
        if (this.webSocket$ === undefined || this.webSocket$.closed) return;
        this.log = this.log + `[this._heartBeatService.serviceState.subscribe][${this.currentPath}] Server is down. Closing [${this.currentPath}] subscription\n`;
        this.unsubscribeSocketSubscription();
      }
    });
  }


  public createWebSocketSubject(path: string) {
    const webSocketAddress = this._heartBeatService.WebSocketAddress;
    // const webSocketAddress="localhost";
    // const webSocketAddress="10.0.30.164";

    this.log = this.log + `\n[${path}] Connecting to WebSocket\n`;
    if (this.webSocket$ !== undefined && !this.webSocket$.closed) {
      this.log = this.log + `[${path}] connected already. Unsubscribing\n`;
      this.unsubscribeSocketSubscription();
    }
    this.currentPath = path;
    this.log = this.log + `[${this.currentPath}] Creating websocket subject\n`;
    this.webSocket$ = webSocket<any>({
      url: `ws://${webSocketAddress}:58000/${path}`,
      openObserver: {
        next: (e: Event) => {
          this.log = this.log + `[openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Type: ${e.type}. Target: ${e.target}\n`;
          this.log = this.log + `[openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Requesting Full State from Server\n`;
          this.sendMessage('Full');
          return;
        },
        error: (e: Event) => this.log = this.log + `[openObserver.error][${(e.target as WebSocket).url}]${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[openObserver.error][${this.currentPath}] Complete\n`,
      },
      closeObserver: {
        next: (e: CloseEvent) => this.log = this.log + `[closeObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Code: ${e.code}. Type ${e.type}. Reason: [${e.reason}] WasClean: ${e.wasClean}\n`,
        error: (e) => this.log = this.log + `[closeObserver.error][${(e.target as WebSocket).url}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closeObserver.complete][${this.currentPath}]\n`,
      },
      closingObserver: {
        next: (e: void) => this.log = this.log + `[closingObserver.next][${this.currentPath}]${JSON.stringify(e)}\n`,
        error: (e) => this.log = this.log + `[closingObserver.error][${this.currentPath}]${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closingObserver.complete][${this.currentPath}]\n`,
      },
    });
    this.subscribeWebSocketSubject();
  }

  public subscribeWebSocketSubject() {
    if (!this.webSocket$) return;
    this.log = this.log + `[${this.currentPath}] Subscribing to websocket\n`;
    this.subscription = this.webSocket$
      .subscribe({
        next: msg => this.log = this.log + `[subscription.next][${this.currentPath}] [${msg}]\n`, // Called whenever there is a message from the server.
        error: err => {
          this.log = this.log + `[subscription.error][${this.currentPath}] ${JSON.stringify(err)}\n`;
          return;
        }, // Called if at any point WebSocket API signals some kind of error.
        complete: () => {
          this.log = this.log + `[subscription.complete][${this.currentPath}]\n`; // Called when connection is closed (for whatever reason).
          return;
        } // Called when connection is closed (for whatever reason).
      });
  }

  public sendMessage(message: string) {
    this.log = this.log + `[this.webSocket$.next(message)][${this.currentPath}] Sending Message: [${message}]\n`;
    this.webSocket$?.next(message);
  }

  public terminateSocketSubscription() {
    this.currentPath = "";
    this.unsubscribeSocketSubscription();
  }

  public unsubscribeSocketSubscription() {
    this.log = this.log + `[this.subscription.unsubscribe()][${this.currentPath}] Unsubscribing from socket subscription\n`
    this.subscription.unsubscribe();
    this.log = this.log + `[this.webSocket.complete()][${this.currentPath}] Closing from websocket\n`
    if (this.webSocket$ === undefined) {
      this.log = this.log + `[this.webSocket.complete()][${this.currentPath}] WebSocket is undefined\n`
      return;
    }
    this.webSocket$.complete();
    this.webSocket$ = undefined;
  }

  public clearLog() {
    this.log = "";
  }
}