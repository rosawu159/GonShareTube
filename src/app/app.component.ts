import { DataSelectorService } from './core/services/data-selector.service';
import { ConnectorService, YtPlayerService } from './core/services';
import { SongInfo } from './difs/song-info';
import { AfterViewInit, Component } from '@angular/core';
import { ElectronService } from './core/services';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import * as AppActions from './state/actions/app.actions'
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { AppStateName } from './state/app.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  $playlist: Observable<SongInfo[]>;
  $currentPlaying: Observable<string>;
  isloading = true;

  constructor(
    public ytPlayerService: YtPlayerService,
    public connectorService: ConnectorService,
    private router: Router,
    private electronService: ElectronService,
    private translate: TranslateService,
    private store: Store<any>,
    private dataSelectorService: DataSelectorService,
  ) {
    this.translate.setDefaultLang('en');
    connectorService.connectToServe();

    console.log('AppConfig', AppConfig);

    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }

    this.ytPlayerService.downloadYoutubeAPI();
    this.getStoreDatas();
  }

  ngAfterViewInit(): void {
    this.ytPlayerService.$isYoutubeAPIReady.subscribe(isLoading => {
      if (!isLoading) {
        this.isloading = false;
        this.processConnectService();
      }
    })
  }

  processConnectService(): void {
    const connection = this.connectorService.serveConnection;

    connection.on('Connected', () => {
      this.router.navigate(['/home']);
    })

    connection.on('ReceiveTubeLink', (tubeLink) => {
      this.ytPlayerService.playVideo(tubeLink);
    });

    connection.onreconnecting(() => {
      this.router.navigate(['/loadingpage']);
    })

    connection.onreconnected(() => {
      this.router.navigate(['/home']);
    })
  }

  getStoreDatas(): void {
    this.$playlist = this.dataSelectorService.getStoreData(AppStateName.playlist)();
    this.$currentPlaying = this.dataSelectorService.getStoreData(AppStateName.currentPlaying)();
  }

  sendGroupTubeLink(tag: string): void {
    const currentGroup$ = this.dataSelectorService.getStoreData(AppStateName.currentGroup)();
    currentGroup$.pipe(take(1)).subscribe(g => {
      if (g) {
        this.connectorService.serveConnection.invoke('SendGroupTubeLink', g, tag);
      }
    })
  }

  doClick(tag: string): void {
    this.store.dispatch(AppActions.setSong({ currentPlaying: tag }))
    this.sendGroupTubeLink(tag);
  }
}
