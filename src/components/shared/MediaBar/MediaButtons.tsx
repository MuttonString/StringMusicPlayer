import IconButton from '@mui/material/IconButton';
import { emit } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { SM_WIDTH } from '../../../constants/window';
import useShortcutKey from '../../../hooks/useShortcutKey';
import useWidthQuery from '../../../hooks/useWidthQuery';
import { useAudio } from '../../../providers/AudioProvider';
import { useConfig } from '../../../providers/ConfigProvider';
import { BackendEvent } from '../../../types/event';
import { KeyCode } from '../../../types/keyCode';
import { isRTL } from '../../../utils/window';
import MaterialIcon from '../../ui/MaterialIcon';
import Tip from '../../ui/Tip';

export default function MediaButtons() {
  const [config] = useConfig();
  const { t } = useTranslation();
  const media = useAudio();
  const notNarrow = useWidthQuery(SM_WIDTH);

  const canChangeTrack = media.playQueue.length > 1;
  const prevSong = canChangeTrack && media.playQueue[media.prevIdx];
  const nextSong = canChangeTrack && media.playQueue[media.nextIdx];
  const canSeekBySentence = config.seekBySentence && media.lyric.length > 1;

  const [seekBackwardKey, seekBackward] = useShortcutKey(
    () => {
      if (!media.pending) emit(BackendEvent.SeekBackward);
    },
    [KeyCode.Ctrl, isRTL() ? KeyCode.Right : KeyCode.Left],
    true,
  );

  const [prevKey, prev] = useShortcutKey(
    () => {
      if (prevSong) emit(BackendEvent.Previous);
    },
    [KeyCode.Shift, isRTL() ? KeyCode.Right : KeyCode.Left],
    true,
  );

  const [toggleKey, toggle] = useShortcutKey(
    () => {
      if (!media.pending) emit(BackendEvent.Toggle);
    },
    [KeyCode.Ctrl, 'P'],
    true,
  );

  const [nextKey, next] = useShortcutKey(
    () => {
      if (nextSong) emit(BackendEvent.Next);
    },
    [KeyCode.Shift, isRTL() ? KeyCode.Left : KeyCode.Right],
    true,
  );

  const [seekForwardKey, seekForward] = useShortcutKey(
    () => {
      if (!media.pending) emit(BackendEvent.SeekForward);
    },
    [KeyCode.Ctrl, isRTL() ? KeyCode.Left : KeyCode.Right],
    true,
  );

  return (
    <div className='flex justify-between w-1/5 min-w-fit border border-divider rounded-full p-1 mt-auto'>
      {notNarrow && (
        <Tip
          placement='top'
          title={
            t(canSeekBySentence ? 'media.prevSentence' : 'media.prev10Sec') +
            ' ' +
            seekBackwardKey
          }
          disabled={media.pending}
        >
          <IconButton
            size='small'
            className='p-0.75!'
            disabled={media.pending}
            onClick={seekBackward}
            aria-label={t(
              canSeekBySentence ? 'media.prevSentence' : 'media.prev10Sec',
            )}
          >
            <MaterialIcon
              name={
                isRTL()
                  ? canSeekBySentence
                    ? 'redo'
                    : 'forward10'
                  : canSeekBySentence
                    ? 'undo'
                    : 'replay10'
              }
            />
          </IconButton>
        </Tip>
      )}

      <Tip
        placement='top'
        disabled={!prevSong}
        title={
          prevSong && (
            <div className='flex flex-col'>
              <div className='font-bold'>{t('media.prev') + ' ' + prevKey}</div>
              <div className='flex gap-1 items-center'>
                {prevSong.cover && (
                  <img
                    alt=''
                    src={prevSong.cover[0]}
                    className='object-cover object-center w-8 h-8 rounded-lg'
                    onLoad={(e) => (e.currentTarget.style.display = '')}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className='flex flex-col'>
                  <div className='flex gap-1'>
                    <bdi dir='auto'>{prevSong.title}</bdi>
                    {prevSong.translation && (
                      <bdi dir='auto' className='opacity-70'>
                        (<bdi dir='auto'>{prevSong.translation}</bdi>)
                      </bdi>
                    )}
                  </div>
                  {prevSong.artists && (
                    <div>
                      <bdi dir='auto' className='opacity-70'>
                        {prevSong.artists.map((item) => item.label).join('; ')}
                      </bdi>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }
      >
        <IconButton
          size='small'
          className='p-0.75!'
          disabled={!prevSong}
          onClick={prev}
          aria-label={
            prevSong
              ? t('media.prev') +
                ': ' +
                (prevSong.translation || prevSong.title)
              : undefined
          }
        >
          <MaterialIcon name={isRTL() ? 'fastForward' : 'fastRewind'} />
        </IconButton>
      </Tip>

      <Tip
        placement='top'
        disabled={media.pending}
        title={t(media.paused ? 'media.play' : 'media.pause') + ' ' + toggleKey}
      >
        <IconButton
          size='small'
          className='p-0! text-3xl!'
          loading={media.pending}
          onClick={toggle}
          aria-label={t(media.paused ? 'media.play' : 'media.pause')}
        >
          <MaterialIcon
            fontSize='inherit'
            name={media.paused ? 'playCircleFilled' : 'pauseCircleFilled'}
          />
        </IconButton>
      </Tip>

      <Tip
        placement='top'
        disabled={!nextSong}
        title={
          nextSong && (
            <div className='flex flex-col'>
              <div className='font-bold'>{t('media.next') + ' ' + nextKey}</div>
              <div className='flex gap-1 items-center'>
                {nextSong.cover && (
                  <img
                    alt=''
                    src={nextSong.cover[0]}
                    className='object-cover object-center w-8 h-8 rounded-lg'
                    onLoad={(e) => (e.currentTarget.style.display = '')}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className='flex flex-col'>
                  <div className='flex gap-1'>
                    <bdi dir='auto'>{nextSong.title}</bdi>
                    {nextSong.translation && (
                      <bdi dir='auto' className='opacity-70'>
                        (<bdi dir='auto'>{nextSong.translation}</bdi>)
                      </bdi>
                    )}
                  </div>
                  {nextSong.artists && (
                    <div>
                      <bdi dir='auto' className='opacity-70'>
                        {nextSong.artists.map((item) => item.label).join('; ')}
                      </bdi>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }
      >
        <IconButton
          size='small'
          className='p-0.75!'
          disabled={!nextSong}
          onClick={next}
          aria-label={
            nextSong
              ? t('media.next') +
                ': ' +
                (nextSong.translation || nextSong.title)
              : undefined
          }
        >
          <MaterialIcon name={isRTL() ? 'fastRewind' : 'fastForward'} />
        </IconButton>
      </Tip>

      {notNarrow && (
        <Tip
          placement='top'
          title={
            t(canSeekBySentence ? 'media.nextSentence' : 'media.next10Sec') +
            ' ' +
            seekForwardKey
          }
          disabled={media.pending}
        >
          <IconButton
            size='small'
            className='p-0.75!'
            disabled={media.pending}
            onClick={seekForward}
            aria-label={t(
              canSeekBySentence ? 'media.nextSentence' : 'media.next10Sec',
            )}
          >
            <MaterialIcon
              name={
                isRTL()
                  ? canSeekBySentence
                    ? 'undo'
                    : 'replay10'
                  : canSeekBySentence
                    ? 'redo'
                    : 'forward10'
              }
            />
          </IconButton>
        </Tip>
      )}
    </div>
  );
}
