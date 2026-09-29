import Button from '@mui/material/Button';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Fragment } from 'react/jsx-runtime';
import { SM_WIDTH } from '../../../constants/window';
import type useShortcutKey from '../../../hooks/useShortcutKey';
import useWidthQuery from '../../../hooks/useWidthQuery';
import { useAudio } from '../../../providers/AudioProvider';
import type { Song } from '../../../types/audio';
import Tip from '../../ui/Tip';

interface Props {
  useShortcutKeyReturnValue: ReturnType<typeof useShortcutKey>;
}

export default function Metadata({ useShortcutKeyReturnValue }: Props) {
  const { t } = useTranslation();
  const media = useAudio();
  const notNarrow = useWidthQuery(SM_WIDTH);
  const currSong = media.playQueue[media.currIdx] as Song | undefined;

  return (
    currSong && (
      <div
        className={classNames(
          'flex flex-col align-middle justify-center h-12',
          notNarrow
            ? 'max-w-[calc(100%-max(20%,160px))]'
            : 'max-w-[calc(100%-max(20%,100px))]',
        )}
      >
        {/* 标题 */}
        <div>
          <Tip
            placement='top'
            title={
              <div className='flex flex-col'>
                <div>{currSong.title}</div>
                {currSong.translation && (
                  <div className='opacity-70'>({currSong.translation})</div>
                )}
                <div>
                  {t('media.playPage') + ' ' + useShortcutKeyReturnValue[0]}
                </div>
              </div>
            }
          >
            <Button
              size='small'
              color='inherit'
              className='pt-0! pb-0! max-w-full min-w-0! text-base!'
              onClick={useShortcutKeyReturnValue[1]}
              aria-label={
                (currSong.translation || currSong.title) +
                '\n' +
                t('media.playPage')
              }
            >
              <div className='truncate'>{currSong.title}</div>
              {currSong.translation && (
                <div className='ms-2 truncate text-text-secondary'>
                  ({currSong.translation})
                </div>
              )}
            </Button>
          </Tip>
        </div>

        {/* 艺术家和专辑 */}
        {((currSong.artists && currSong.artists.length > 0) ||
          currSong.album) && (
          <div className='flex items-baseline w-full'>
            {currSong.artists && currSong.artists.length > 0 && (
              <div className='flex items-baseline max-w-4/5'>
                {currSong.artists.map((item, idx, arr) => (
                  <Fragment key={idx}>
                    <Tip
                      title={
                        <div className='flex flex-col'>
                          <div className='font-bold'>{t('media.artist')}</div>
                          <div>{item.label}</div>
                          {item.translation && (
                            <div className='opacity-70'>
                              ({item.translation})
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div className='shrink grow-0 min-w-0 leading-none'>
                        <Button
                          size='small'
                          color='inherit'
                          className='pt-0! pb-0! w-full min-w-0!'
                          disabled={!item.id}
                          aria-label={
                            t('media.artist') +
                            ': ' +
                            (item.translation || item.label)
                          }
                        >
                          <div
                            className={classNames(
                              'truncate',
                              item.id
                                ? 'text-text-secondary'
                                : 'text-text-disabled',
                            )}
                          >
                            {item.label}
                          </div>
                        </Button>
                      </div>
                    </Tip>
                    {idx !== arr.length - 1 && (
                      <div
                        className={classNames(
                          'leading-none text-divider -ms-1 -z-1',
                          item.id
                            ? 'text-text-secondary'
                            : 'text-text-disabled',
                        )}
                      >
                        ;
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}

            {currSong.artists &&
              currSong.artists.length > 0 &&
              currSong.album && (
                <div className='leading-none text-divider'>|</div>
              )}

            {currSong.album && (
              <Tip
                title={
                  <div className='flex flex-col'>
                    <div className='font-bold'>{t('media.album')}</div>
                    <div>{currSong.album.label}</div>
                    {currSong.album.translation && (
                      <div className='opacity-70'>
                        ({currSong.album.translation})
                      </div>
                    )}
                  </div>
                }
              >
                <div className='flex min-w-0'>
                  <Button
                    size='small'
                    color='inherit'
                    className='pt-0! pb-0! min-w-0!'
                    disabled={!currSong.album.id}
                    aria-label={
                      t('media.album') +
                      ': ' +
                      (currSong.album.translation || currSong.album.label)
                    }
                  >
                    <div
                      className={classNames(
                        'truncate',
                        currSong.album.id
                          ? 'text-text-secondary'
                          : 'text-text-disabled',
                      )}
                    >
                      {currSong.album.label}
                    </div>
                  </Button>
                </div>
              </Tip>
            )}
          </div>
        )}
      </div>
    )
  );
}
