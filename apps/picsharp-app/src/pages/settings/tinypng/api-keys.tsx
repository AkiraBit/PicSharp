import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table';
import { memo, useState, useMemo, useLayoutEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Trash, KeyRound, Loader2 } from 'lucide-react';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { debounce } from 'radash';
import { useI18n } from '@/i18n';
import { Trans } from 'react-i18next';
import { SettingsKey } from '@/constants';
import { Tinify } from '@/utils/tinify';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { showAlertDialog } from '@/components/ui/alert-dialog';
import { DropdownButton } from '@/components/dropdown-button';
import { open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';
import { isValidArray } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import SettingItem from '../setting-item';

export default memo(function SettingsCompressionTinyPngApiKeys() {
  const t = useI18n();
  const { tinypng_api_keys: tinypngApiKeys, set } = useSettingsStore(
    useSelector([SettingsKey.TinypngApiKeys, 'set']),
  );
  const [loading, setLoading] = useState(false);

  const handleDelete = async (apiKey: string) => {
    const newApiKeys = tinypngApiKeys.filter((item) => item.api_key !== apiKey);
    await set(SettingsKey.TinypngApiKeys, newApiKeys);
    toast.success(t('delete_success'));
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      header: t('settings.compression.tinypng_api_keys.table.name'),
      cell: ({ row }) => (
        <div className='min-w-[10%] max-w-[80%] truncate'>{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'api_key',
      id: 'api_key',
      header: t('settings.compression.tinypng_api_keys.table.api_key'),
      cell: ({ row }) => (
        <div className='min-w-[10%] max-w-[80%] cursor-pointer truncate'>
          {row.original.api_key}
        </div>
      ),
    },
    {
      accessorKey: 'usage',
      id: 'usage',
      header: t('settings.compression.tinypng_api_keys.table.usage'),
      cell: ({ row }) => (
        <div className='min-w-[50px] cursor-pointer'>{row.original.usage || 0}</div>
      ),
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: t('settings.compression.tinypng_api_keys.table.status'),
      cell: ({ row }) => (
        <div className='text-nowrap'>
          {row.original.status === 'valid' ? (
            <Badge variant='default'>{t('valid')}</Badge>
          ) : (
            <Badge variant='destructive'>{t('invalid')}</Badge>
          )}
        </div>
      ),
    },
    // {
    //   accessorKey: 'created_at',
    //   id: 'created_at',
    //   header: t('settings.compression.tinypng_api_keys.table.created_at'),
    //   cell: ({ row }) => (
    //     <div className='min-w-[10%] max-w-[80%] truncate'>
    //       {dayjs(Number(row.original.created_at)).format('YYYY-MM-DD HH:mm:ss')}
    //     </div>
    //   ),
    // },
    {
      header: t('settings.compression.tinypng_api_keys.table.actions'),
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => {
            showAlertDialog({
              title: t('settings.compression.tinypng_api_keys.table.delete_description'),
              description: '',
              // description: t(
              //   "settings.compression.tinypng_api_keys.table.delete_description"
              // ),
              okText: t('confirm'),
              cancelText: t('cancel'),
              onConfirm: async () => {
                await handleDelete(row.original.api_key);
              },
            });
          }}
        >
          <Trash className='h-4 w-4 text-red-500' />
        </Button>
      ),
    },
  ];

  const handleRefreshUsage = async () => {
    if (isValidArray(tinypngApiKeys)) {
      setLoading(true);
      const newApiKeys = await Promise.all(
        tinypngApiKeys.map(async (item) => {
          const { ok, compressionCount = '-' } = await Tinify.validate(item.api_key);
          return {
            ...item,
            usage: compressionCount,
            status: ok ? 'valid' : 'invalid',
          };
        }),
      );
      await set(SettingsKey.TinypngApiKeys, newApiKeys);
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    handleRefreshUsage();
  }, []);

  return (
    <>
      <SettingItem
        title={t('settings.compression.tinypng_api_keys.title')}
        description={
          <Trans
            // @ts-ignore
            i18nKey='settings.compression.tinypng_api_keys.description'
            components={{
              tinypng: (
                <a
                  target='_blank'
                  href='https://tinypng.com/developers'
                  className='text-blue-500 underline'
                />
              ),
              here: (
                <a
                  target='_blank'
                  href='https://tinypng.com/developers'
                  className='text-blue-500 underline'
                />
              ),
            }}
          ></Trans>
        }
      >
        <div className='flex items-center gap-2'>
          <Button variant='default' size='sm' onClick={handleRefreshUsage} disabled={loading}>
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <AddApiKeyDialog />
        </div>
      </SettingItem>
      <CardContent className='pb-0'>
        {isValidArray(tinypngApiKeys) ? (
          loading ? (
            <div className='w-full space-y-2'>
              <Skeleton className='h-6 w-full' />
              <Skeleton className='h-6 w-full' />
              <Skeleton className='h-6 w-full' />
            </div>
          ) : (
            <DataTable columns={columns} scrollable data={tinypngApiKeys} />
          )
        ) : (
          <div className='flex flex-col items-center justify-center text-center'>
            <KeyRound className='text-muted-foreground h-12 w-12' />
            <h3 className='mt-4 text-lg font-semibold'>
              {t('settings.compression.tinypng_api_keys.no_api_keys')}
            </h3>
          </div>
        )}
      </CardContent>
    </>
  );
});

const tinypngApiKeySchema = z.object({
  name: z.string().nonempty('Name is required'),
  api_key: z.string().nonempty('API Key is required'),
});

type TinypngApiKeyFormData = z.infer<typeof tinypngApiKeySchema>;

// 定义校验策略接口
interface ValidationStrategy {
  validate(
    data: TinypngApiKeyFormData,
    tinypngApiKeys: any[],
  ): Promise<{
    isValid: boolean;
    error?: {
      field: 'name' | 'api_key';
      msgKey: string;
    };
    payload?: Record<string, any>;
  }>;
}

// 名称重复校验策略
const nameValidationStrategy: ValidationStrategy = {
  async validate(data, tinypngApiKeys) {
    const exists = tinypngApiKeys.findIndex((item) => item.name === data.name) !== -1;
    return {
      isValid: !exists,
      error: exists
        ? {
            field: 'name',
            msgKey: 'settings.compression.tinypng_api_keys.form.name_already_exists',
          }
        : undefined,
    };
  },
};

// API Key重复校验策略
const apiKeyValidationStrategy: ValidationStrategy = {
  async validate(data, tinypngApiKeys) {
    const exists = tinypngApiKeys.findIndex((item) => item.api_key === data.api_key) !== -1;
    return {
      isValid: !exists,
      error: exists
        ? {
            field: 'api_key',
            msgKey: 'settings.compression.tinypng_api_keys.form.api_already_exists',
          }
        : undefined,
    };
  },
};

// API Key有效性校验策略
const apiKeyValidityStrategy: ValidationStrategy = {
  async validate(data) {
    const { ok, compressionCount = 0 } = await Tinify.validate(data.api_key);
    return {
      isValid: ok,
      error: !ok
        ? {
            field: 'api_key',
            msgKey: 'settings.compression.tinypng_api_keys.form.invalid_api_key',
          }
        : undefined,
      payload: {
        usage: Number(compressionCount),
      },
    };
  },
};

// 组合校验策略
const validateApiKey = async (data: TinypngApiKeyFormData, tinypngApiKeys: any[]) => {
  const strategies = {
    name: nameValidationStrategy,
    api_key: apiKeyValidationStrategy,
    api_key_validity: apiKeyValidityStrategy,
  };

  const payload: Record<string, any> = {};

  for (const [key, strategy] of Object.entries(strategies)) {
    const result = await strategy.validate(data, tinypngApiKeys);
    if (!result.isValid) {
      return result;
    }
    if (result.payload) {
      payload[key] = result.payload;
    }
  }

  return { isValid: true, payload };
};

function AddApiKeyDialog() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const t = useI18n();
  const { tinypng_api_keys: tinypngApiKeys, set } = useSettingsStore(
    useSelector([SettingsKey.TinypngApiKeys, 'set']),
  );

  const form = useForm<TinypngApiKeyFormData>({
    resolver: zodResolver(tinypngApiKeySchema),
    defaultValues: {
      name: '',
      api_key: '',
    },
  });

  const handleSubmit = async (data: TinypngApiKeyFormData) => {
    setIsSubmiting(true);
    const validationResult = await validateApiKey(data, tinypngApiKeys);

    if (!validationResult.isValid && validationResult.error) {
      form.setError(validationResult.error.field, {
        type: 'manual',
        message: t(validationResult.error.msgKey as any),
      });
      setIsSubmiting(false);
      return;
    }

    await set(SettingsKey.TinypngApiKeys, [
      ...tinypngApiKeys,
      {
        ...data,
        usage: Number(validationResult?.payload?.api_key_validity?.usage || 0) || '-',
        status: 'valid',
        created_at: Date.now(),
      },
    ]);
    setIsSubmiting(false);
    setIsAddDialogOpen(false);
    form.reset();
    toast.success(t('add_success'));
  };

  const ErrorTableColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      header: t('settings.compression.tinypng_api_keys.table.name'),
      cell: ({ row }) => <div>{row.original.name}</div>,
    },
    {
      accessorKey: 'api_key',
      id: 'api_key',
      header: t('settings.compression.tinypng_api_keys.table.api_key'),
      cell: ({ row }) => <div>{row.original.api_key}</div>,
    },
    {
      accessorKey: 'err_msg',
      id: 'errMsg',
      header: t('settings.compression.tinypng_api_keys.table.err_msg'),
      cell: ({ row }) => <div className='text-nowrap'>{row.original.err_msg}</div>,
    },
  ];

  const dropdownItems = [
    {
      key: 'import',
      label: t('import'),
      disabled: isLoading,
      onClick: async () => {
        try {
          setIsLoading(true);
          const file = await open({
            multiple: false,
            filters: [{ name: 'JSON', extensions: ['json'] }],
          });
          if (file) {
            const content = await readTextFile(file);
            const data = z.array(tinypngApiKeySchema).safeParse(JSON.parse(content));
            if (data.success) {
              const validateResults = await Promise.all(
                data.data.map(async (item) => {
                  const result = await validateApiKey(item, tinypngApiKeys);
                  return {
                    ...result,
                    ...item,
                    err_msg: result.error?.msgKey ? t(result.error.msgKey as any) : '',
                  };
                }),
              );
              const invalidResults = validateResults.filter((i) => !i.isValid);
              if (isValidArray(invalidResults)) {
                showAlertDialog({
                  title: t('import_failed'),
                  isTextContent: false,
                  description: <DataTable columns={ErrorTableColumns} data={invalidResults} />,
                  okText: t('confirm'),
                  cancelText: t('cancel'),
                });
                return;
              }
              await set(
                SettingsKey.TinypngApiKeys,
                data.data.map((item) => ({
                  ...item,
                  usage:
                    Number(
                      validateResults.find((i) => i.api_key === item.api_key)?.payload
                        ?.api_key_validity?.usage || 0,
                    ) || '-',
                  status: 'valid',
                  created_at: Date.now(),
                })),
              );
              toast.success(t('import_success'));
            } else {
              toast.error(`${t('import_failed')}: ${data.error.toString()}`);
            }
          }
        } catch (error) {
          toast.error(`${t('import_failed')}: ${error.toString()}`);
        } finally {
          setIsLoading(false);
        }
      },
    },
    {
      key: 'export',
      label: t('export'),
      disabled: !isValidArray(tinypngApiKeys) || isLoading,
      onClick: async () => {
        try {
          setIsLoading(true);
          const file = await open({
            directory: true,
          });
          if (file) {
            const content = JSON.stringify(
              tinypngApiKeys.map((item: any) => ({
                name: item.name,
                api_key: item.api_key,
              })),
              null,
              2,
            );
            const path = `${file}/PicSharp_tinypng_api_keys_${Date.now()}.json`;
            await writeTextFile(path, content);
            toast.success(t('export_success'), {
              action: {
                label: t('click_to_view'),
                onClick: () => {
                  openPath(path);
                },
              },
            });
          }
        } catch (err) {
          toast.error(`${t('export_failed')}: ${err.toString()}`);
        } finally {
          setIsLoading(false);
        }
      },
    },
  ];

  return (
    <Dialog
      open={isAddDialogOpen}
      onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <DropdownButton placement='bottomLeft' size='sm' items={dropdownItems} loading={isLoading}>
          <PlusCircle className='mr-2 h-4 w-4' />
          {t('settings.compression.tinypng_api_keys.form.add')}
        </DropdownButton>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.compression.tinypng_api_keys.form.add_title')}</DialogTitle>
              <DialogDescription>
                {t('settings.compression.tinypng_api_keys.form.add_description')}
              </DialogDescription>
            </DialogHeader>
            <div className='mt-4 flex flex-col gap-2'>
              <div className='flex flex-col gap-2'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.compression.tinypng_api_keys.form.name')}</FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          placeholder={t(
                            'settings.compression.tinypng_api_keys.form.name_placeholder',
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <FormField
                  control={form.control}
                  name='api_key'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('settings.compression.tinypng_api_keys.form.api_key')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          placeholder={t(
                            'settings.compression.tinypng_api_keys.form.api_key_placeholder',
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <DialogTrigger asChild>
                <Button variant='outline'>
                  {t('settings.compression.tinypng_api_keys.form.cancel')}
                </Button>
              </DialogTrigger>
              <Button type='submit' disabled={isSubmiting}>
                {isSubmiting ? (
                  <>
                    <Loader2 className='animate-spin' />
                    {t('please_wait')}
                  </>
                ) : (
                  <>
                    <PlusCircle className='h-4 w-4' />
                    {t('settings.compression.tinypng_api_keys.form.add')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
