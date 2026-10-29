import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Image } from '@tauri-apps/api/image';
import { writeImage } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { parseWebStream, selectCover } from 'music-metadata';
import type { RefObject } from 'react';
import { useCallback, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../app/i18n';
import {
  IMAGE_FILE_FILTER,
  IMAGE_FILE_MIME_MAP,
} from '../../../constants/file';
import { IS_DESKTOP } from '../../../constants/os';
import type { SongDetail } from '../../../types/audio';
import {
  formatTime,
  getAudioDuration,
  getBasename,
  removeExt,
} from '../../../utils/data';
import { fetchAlt } from '../../../utils/fetch';
import DialogTemplate from '../../ui/DialogTemplate';
import MaterialIcon from '../../ui/MaterialIcon';

interface Props {
  ref: RefObject<(src: string) => void>;
}

export default function InfoDialog({ ref }: Props) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SongDetail>();
  const { t } = useTranslation();
  const [copying, setCopying] = useState(false);

  useImperativeHandle(
    ref,
    () =>
      async function (src) {
        const url = detail?.cover?.url;
        if (url) URL.revokeObjectURL(url);
        setCopying(false);
        setDetail(undefined);
        setOpen(true);

        const resp = await fetchAlt(src);
        const meta = await parseWebStream(resp.body);
        let duration = meta.format.duration;
        if (duration === undefined) {
          duration = await getAudioDuration(src);
        }
        const pic = selectCover(meta.common.picture);
        setDetail({
          cover: pic && {
            format: pic.format,
            data: pic.data,
            url: URL.createObjectURL(
              new Blob([pic.data as BufferSource], {
                type: pic.format,
              }),
            ),
          },
          title: meta.common.title || removeExt(getBasename(src)),
          src:
            /^https?:\/\/asset\.localhost/i.test(src) ||
            /^asset:\/\/localhost/i.test(src)
              ? decodeURIComponent(new URL(src).pathname.slice(1))
              : src,
          year: meta.common.year,
          trackNo: meta.common.track.no,
          trackTotal: meta.common.track.of,
          artists: meta.common.artists,
          album: meta.common.album,
          albumArtists: meta.common.albumartists,
          container: meta.format.container,
          codec: meta.format.codec,
          codecProfile: meta.format.codecProfile,
          duration,
          bitrate: meta.format.bitrate,
          sampleRate: meta.format.sampleRate,
          bitsPerSample: meta.format.bitsPerSample,
          lossless: meta.format.lossless,
          numberOfChannels: meta.format.numberOfChannels,
        });
      },
  );

  const copy = useCallback(async () => {
    const pic = detail!.cover!;
    setCopying(true);
    try {
      await writeImage(pic.data);
    } catch (err) {
      try {
        // 若图片无法直接写入剪切板，处理后再试
        const img = new window.Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = pic.url;
        });
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw 'Failed to get canvas context';

        ctx.drawImage(img, 0, 0);
        const image = await Image.new(
          new Uint8Array(
            ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer,
          ),
          w,
          h,
        );
        await writeImage(image);
      } catch (err) {
        console.error('Failed to write image to clipboard: ' + err);
      }
    }
    setCopying(false);
  }, [detail]);

  const saveAs = useCallback(
    async (defaultPath: string, data: Uint8Array) => {
      const path = await save({
        title: t('infoDialog.save'),
        defaultPath,
        filters: [
          {
            name: t('common.imageFiles'),
            extensions: [
              'png',
              'jpg',
              'jpeg',
              'jfif',
              'pjpeg',
              'pjp',
              'webp',
              'bmp',
              'gif',
              'apng',
              'avif',
            ],
          },
          ...IMAGE_FILE_FILTER,
          { name: t('common.allFiles'), extensions: ['*'] },
        ],
      });

      if (!path) return;
      try {
        await writeFile(path, data);
      } catch (err) {
        console.error(`Failed to write file to ${path}: ${err}`);
      }
    },
    [t],
  );

  const lang = i18n.languages;
  const formatNum = useCallback(
    (num: number) =>
      new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(num),
    [lang],
  );

  return (
    <DialogTemplate
      open={open}
      onClose={() => setOpen(false)}
      maxWidth='xs'
      title={t('infoDialog.title')}
    >
      {detail ? (
        <div className='flex flex-col gap-2'>
          {detail.cover ? (
            <div className='flex gap-2'>
              <img
                className='object-cover object-center w-30 h-30'
                src={detail.cover.url}
              />
              <div className='flex flex-col justify-between'>
                <div className='ms-1.5 font-bold'>
                  <bdi dir='auto'>{detail.title}</bdi>
                </div>
                <div className='flex flex-col -mb-2 w-fit'>
                  {IS_DESKTOP && (
                    <Button
                      loading={copying}
                      loadingPosition='start'
                      className='text-start w-fit'
                      startIcon={<MaterialIcon name='contentCopy' />}
                      onClick={copy}
                    >
                      {t('infoDialog.copy')}
                    </Button>
                  )}
                  <Button
                    className='text-start w-fit'
                    startIcon={<MaterialIcon name='saveAs' />}
                    onClick={() =>
                      saveAs(
                        detail.title +
                          (IMAGE_FILE_MIME_MAP[
                            detail.cover!
                              .format as keyof typeof IMAGE_FILE_MIME_MAP
                          ] || 'png'),
                        detail.cover!.data,
                      )
                    }
                  >
                    {t('infoDialog.save')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className='font-bold'>
              <bdi dir='auto'>{detail.title}</bdi>
            </div>
          )}

          <Table size='small' sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell className='w-30' />
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody className='[&_th]:ps-0! [&_th]:w-30 wrap-break-word [&_td]:pe-0!'>
              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.source')}
                </TableCell>
                <TableCell className='wrap-anywhere'>
                  {!/^https?:\/\//i.test(detail.src) && !IS_DESKTOP ? (
                    detail.src
                  ) : (
                    <Button
                      dir='ltr'
                      className='text-start p-0!'
                      onClick={() => {
                        if (/^https?:\/\//i.test(detail.src)) {
                          openUrl(detail.src);
                        } else {
                          revealItemInDir(detail.src);
                        }
                      }}
                    >
                      {detail.src}
                    </Button>
                  )}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.year')}
                </TableCell>
                <TableCell>{detail.year || '-'}</TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.track')}
                </TableCell>
                <TableCell>
                  {(detail.trackNo === null ? '-' : String(detail.trackNo)) +
                    (detail.trackTotal === null
                      ? ''
                      : ` / ${detail.trackTotal}`)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.artists')}
                </TableCell>
                <TableCell>
                  <bdi dir='auto'>{detail.artists?.join('; ') || '-'}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.album')}
                </TableCell>
                <TableCell>
                  <bdi dir='auto'>{detail.album || '-'}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.albumArtists')}
                </TableCell>
                <TableCell>
                  <bdi dir='auto'>{detail.albumArtists?.join('; ') || '-'}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.container')}
                </TableCell>
                <TableCell>
                  <bdi dir='auto'>{detail.container || '-'}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.codec')}
                </TableCell>
                <TableCell>
                  <bdi dir='auto'>{detail.codec || '-'}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.codecProfile')}
                </TableCell>
                <TableCell>
                  <bdi dir='auto'>{detail.codecProfile || '-'}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.duration')}
                </TableCell>
                <TableCell>
                  <bdi dir='ltr'>{`${formatTime(detail.duration)} (${formatNum(detail.duration)} s)`}</bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.bitrate')}
                </TableCell>
                <TableCell>
                  <bdi dir='ltr'>
                    {detail.bitrate === undefined
                      ? '-'
                      : formatNum(detail.bitrate / 1000) + ' kbps'}
                  </bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.sampleRate')}
                </TableCell>
                <TableCell>
                  <bdi dir='ltr'>
                    {detail.sampleRate === undefined
                      ? '-'
                      : formatNum(detail.sampleRate / 1000) + ' kHz'}
                  </bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.bitsPerSample')}
                </TableCell>
                <TableCell>
                  <bdi dir='ltr'>
                    {detail.bitsPerSample === undefined
                      ? '-'
                      : detail.bitsPerSample + ' bit'}
                  </bdi>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.lossless')}
                </TableCell>
                <TableCell>
                  {detail.lossless === undefined
                    ? '-'
                    : detail.lossless
                      ? t('infoDialog.yes')
                      : t('infoDialog.no')}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell component='th' variant='head'>
                  {t('infoDialog.numberOfChannels')}
                </TableCell>
                <TableCell>
                  {detail.numberOfChannels
                    ? detail.numberOfChannels === 1
                      ? `1 (${t('infoDialog.mono')})`
                      : detail.numberOfChannels === 2
                        ? `2 (${t('infoDialog.stereo')})`
                        : detail.numberOfChannels
                    : '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <CircularProgress />
      )}
    </DialogTemplate>
  );
}
