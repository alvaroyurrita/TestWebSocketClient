import { Component } from '@angular/core';
import { Observable, Subscription, retry, timer } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})



export class AppComponent {
  title = 'TestWebsockets';
  webSubject$: WebSocketSubject<any> = <WebSocketSubject<any>>{};
  subscription: Subscription = <Subscription>{};
  private path:string = "";
  public log: string = "";

  public createWebeSocketSubject(path: string) {
    this.path = path;
    this.log = this.log + `Creating websocket subject with path: ${path}\n`;
    this.webSubject$ = webSocket<any>({
      // url: 'ws://localhost:58000/' + path,
      url: 'ws://192.168.0.135:58000/' + path,
      openObserver: {
        next: (e:Event) => this.log = this.log + `[openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Type: ${e.type}. Target: ${e.target}\n`,
        error: (e: Event) => this.log = this.log + `[openObserver.error][${this.path}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[openObserver.complete][${this.path}]\n`,
      },
      closeObserver: {
        next: (e: CloseEvent) => this.log = this.log + `[closeObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Code: ${e.code}. Type ${e.type}. Reason: [${e.reason}] WasClean: ${e.wasClean}\n`,
        error: (e) => this.log = this.log + `[closeObserver.error][${this.path}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closeObserver.complete][${this.path}]\n`,
      },
      closingObserver: {
        next: (e) => this.log = this.log + `[closingObserver.next]\n`,
        error: (e) => this.log = this.log + `[closingObserver.error][${this.path}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closingObserver.complete][${this.path}]\n`,
      },
    });
  }

  public subscribeWebSocketSubject() {
    this.log = this.log + `Subscribing to websocket\n`;
    this.subscription = this.webSubject$.pipe(
      retry({ count: Infinity, delay: (_,retryCount) =>{
        this.log = this.log + `[retry] ${retryCount} Retrying\n`;
        return timer(1000);
      }, resetOnSuccess: true })
    ).subscribe({
      next: msg => this.log = this.log + `[subcription.next][${this.path}] [${msg}]\n`, // Called whenever there is a message from the server.
      error: err => this.log = this.log + `[subcription.error][${this.path}] ${JSON.stringify(err)}\n`, // Called if at any point WebSocket API signals some kind of error.
      complete: () => this.log = this.log + `[subcription.complete][${this.path}]\n` // Called when connection is closed (for whatever reason).
    });
    timer
  }

  public sendMessage(message: string) {
    this.log = this.log + `[this.subject.next(message)] Sending Message: [${message}]\n`;
    this.webSubject$.next(message);
  }


  public unsubcribeSocketSubscription() {
    this.log = this.log + `[this.subscription.unsubscribe()] Unsubscribing from socket subscription\n`
    this.subscription.unsubscribe();
  }

  public unsubcribeSocketSubject() {
    this.log = this.log + `[this.subject.unsubscribe()] Unsubscribing from socket subject\n`
    this.webSubject$.unsubscribe();
  }

  public completeConnection() {
    this.log = this.log + `[this.subject.complete()] Completing Connection\n`
    this.webSubject$.complete(); // Closes the connection.
  }

  public completeWithError() {
    this.log = this.log + `[this.subject.error(...)] Completing Connection with Error\n`
    this.webSubject$.error({ code: 4500, reason: 'Client Completing With Error!' }); // Informs the server that this client is disconnecting.
  }

  public clearLog(){
    this.log = "";
  }


}
